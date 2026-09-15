import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, gql } from 'urql';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';

// --- GraphQL Queries & Mutations ---
const GET_CUSTOMER_DATA = gql`
  query GetCustomerData {
    customer {
      firstname
      lastname
      email
      addresses {
        id
        firstname
        lastname
        street
        city
        region { region region_id }
        postcode
        country_code
        telephone
        default_shipping
        default_billing
      }
      orders {
        items {
          id
          number
          order_date
          status
          total { grand_total { value currency } }
        }
      }
    }
    customerDownloadableProducts {
      items {
        order_increment_id
        date
        status
        download_url
        remaining_downloads
      }
    }
  }
`;

const GET_COUNTRIES = gql`
  query GetCountries {
    countries {
      id
      full_name_locale
      available_regions {
        id
        code
        name
      }
    }
  }
`;

const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($firstname: String!, $lastname: String!) {
    updateCustomerV2(input: { firstname: $firstname, lastname: $lastname }) {
      customer { firstname lastname email }
    }
  }
`;

const CHANGE_PASSWORD = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changeCustomerPassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      customer { email }
    }
  }
`;

const CREATE_ADDRESS = gql`
  mutation CreateAddress($input: CustomerAddressInput!) {
    createCustomerAddress(input: $input) { id }
  }
`;

const UPDATE_ADDRESS = gql`
  mutation UpdateAddress($id: Int!, $input: CustomerAddressInput!) {
    updateCustomerAddress(id: $id, input: $input) { id }
  }
`;

const DELETE_ADDRESS = gql`
  mutation DeleteAddress($id: Int!) {
    deleteCustomerAddress(id: $id)
  }
`;

export default function Account() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'dashboard');
  
  const [editForm, setEditForm] = useState({ firstname: '', lastname: '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    id: null, firstname: '', lastname: '', telephone: '', street: '', city: '', region: '', region_id: '', postcode: '', country_code: 'US', default_shipping: false, default_billing: false
  });

  const [{ data, fetching, error }, reexecuteQuery] = useQuery({ 
    query: GET_CUSTOMER_DATA,
    pause: !isAuthenticated 
  });

  const [{ data: countriesData }] = useQuery({ 
    query: GET_COUNTRIES,
    pause: !isAuthenticated 
  });

  const [, executeUpdateProfile] = useMutation(UPDATE_CUSTOMER);
  const [, executePassword] = useMutation(CHANGE_PASSWORD);
  const [, executeCreateAddress] = useMutation(CREATE_ADDRESS);
  const [, executeUpdateAddress] = useMutation(UPDATE_ADDRESS);
  const [, executeDeleteAddress] = useMutation(DELETE_ADDRESS);

  useEffect(() => {
    if (!isAuthenticated) navigate('/customer/account/login');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    if (data?.customer) {
      setEditForm({ firstname: data.customer.firstname, lastname: data.customer.lastname });
    }
    setMessage({ type: '', text: '' });
    setIsEditingAddress(false);
  }, [data, activeTab]);

  if (fetching) return <div style={{ padding: '2rem' }}>Loading account details...</div>;
  if (error) return <div style={{ padding: '2rem' }}>Error loading account data: {error.message.replace('[GraphQL] ', '')}</div>;

  const customer = data?.customer;
  const orders = customer?.orders?.items || [];
  const addresses = customer?.addresses || [];
  const downloads = data?.customerDownloadableProducts?.items || [];
  const countries = countriesData?.countries || [];

  const handleLogout = () => {
    logout();
    navigate('/customer/account/login');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setActionLoading(true);
    
    const result = await executeUpdateProfile(editForm);
    setActionLoading(false);

    if (result.error) {
      setMessage({ type: 'error', text: result.error.message.replace('[GraphQL] ', '') });
    } else {
      setMessage({ type: 'success', text: 'You saved the account information.' });
      reexecuteQuery({ requestPolicy: 'network-only' });
      setActiveTab('dashboard');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (passForm.newPassword !== passForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setActionLoading(true);
    const result = await executePassword({ 
      currentPassword: passForm.currentPassword, 
      newPassword: passForm.newPassword 
    });
    setActionLoading(false);

    if (result.error) {
      setMessage({ type: 'error', text: result.error.message.replace('[GraphQL] ', '') });
    } else {
      setMessage({ type: 'success', text: 'You updated your password.' });
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setActiveTab('dashboard');
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    const selectedCountry = countries.find(c => c.id === addressForm.country_code);
    const hasRegions = selectedCountry?.available_regions && selectedCountry.available_regions.length > 0;

    const input = {
      firstname: addressForm.firstname,
      lastname: addressForm.lastname,
      telephone: addressForm.telephone,
      street: [addressForm.street],
      city: addressForm.city,
      region: hasRegions ? { region_id: parseInt(addressForm.region_id) } : { region: addressForm.region },
      postcode: addressForm.postcode,
      country_code: addressForm.country_code,
      default_shipping: addressForm.default_shipping,
      default_billing: addressForm.default_billing
    };

    setActionLoading(true);
    let result;
    if (addressForm.id) {
      result = await executeUpdateAddress({ id: addressForm.id, input });
    } else {
      result = await executeCreateAddress({ input });
    }
    setActionLoading(false);

    if (result.error) {
      setMessage({ type: 'error', text: result.error.message.replace('[GraphQL] ', '') });
    } else {
      setMessage({ type: 'success', text: 'You saved the address.' });
      setIsEditingAddress(false);
      reexecuteQuery({ requestPolicy: 'network-only' });
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    
    setActionLoading(true);
    const result = await executeDeleteAddress({ id });
    setActionLoading(false);

    if (result.error) {
      setMessage({ type: 'error', text: result.error.message.replace('[GraphQL] ', '') });
    } else {
      setMessage({ type: 'success', text: 'You deleted the address.' });
      reexecuteQuery({ requestPolicy: 'network-only' });
    }
  };

  const openAddressEdit = (address = null) => {
    if (address) {
      setAddressForm({
        id: address.id,
        firstname: address.firstname,
        lastname: address.lastname,
        telephone: address.telephone,
        street: address.street[0] || '',
        city: address.city,
        region: address.region?.region || '',
        region_id: address.region?.region_id || '',
        postcode: address.postcode,
        country_code: address.country_code,
        default_shipping: address.default_shipping,
        default_billing: address.default_billing
      });
    } else {
      setAddressForm({
        id: null, firstname: '', lastname: '', telephone: '', street: '', city: '', region: '', region_id: '', postcode: '', country_code: 'US', default_shipping: false, default_billing: false
      });
    }
    setIsEditingAddress(true);
  };

  // --- Render Helpers ---
  const renderDashboard = () => (
    <>
      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Account Information</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)' }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Contact Information</h4>
          <p style={{ margin: '0 0 0.5rem 0' }}>{customer?.firstname} {customer?.lastname}</p>
          <p style={{ margin: '0 0 1.5rem 0', color: 'var(--secondary-color)' }}>{customer?.email}</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setActiveTab('edit')} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: 0 }}>Edit</button>
            <button onClick={() => setActiveTab('password')} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: 0 }}>Change Password</button>
          </div>
        </div>
      </div>
    </>
  );

  const renderOrders = () => (
    <div>
      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>My Orders</h3>
      {orders.length === 0 ? (
        <p style={{ marginTop: '1.5rem', color: 'var(--secondary-color)' }}>You have placed no orders.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1.5rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '1rem 0' }}>Order #</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem 0' }}>{order.number}</td>
                <td>{order.order_date.split(' ')[0]}</td>
                <td>{formatCurrency(order.total.grand_total.value, order.total.grand_total.currency)}</td>
                <td>{order.status}</td>
                <td>
                  <button 
                    onClick={() => navigate(`/customer/order/${order.number}`)} 
                    style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: 0 }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderDownloads = () => (
    <div>
      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>My Downloadable Products</h3>
      {downloads.length === 0 ? (
        <p style={{ marginTop: '1.5rem', color: 'var(--secondary-color)' }}>You have not purchased any downloadable products yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1.5rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '1rem 0' }}>Order #</th>
              <th>Date</th>
              <th>Remaining</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {downloads.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem 0' }}>{item.order_increment_id}</td>
                <td>{item.date.split(' ')[0]}</td>
                <td>{item.remaining_downloads}</td>
                <td>{item.status}</td>
                <td>
                  {item.status === 'AVAILABLE' ? (
                    <a href={item.download_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>Download</a>
                  ) : (
                    <span style={{ color: 'var(--secondary-color)' }}>Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderAddressBook = () => {
    if (isEditingAddress) {
      const selectedCountry = countries.find(c => c.id === addressForm.country_code);
      const hasRegions = selectedCountry?.available_regions && selectedCountry.available_regions.length > 0;

      return (
        <div style={{ maxWidth: '600px' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            {addressForm.id ? 'Edit Address' : 'Add New Address'}
          </h3>
          <form onSubmit={handleSaveAddress} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label>First Name</label>
                <input type="text" className="form-input" required value={addressForm.firstname} onChange={e => setAddressForm({...addressForm, firstname: e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label>Last Name</label>
                <input type="text" className="form-input" required value={addressForm.lastname} onChange={e => setAddressForm({...addressForm, lastname: e.target.value})} />
              </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Telephone</label>
              <input type="text" className="form-input" required value={addressForm.telephone} onChange={e => setAddressForm({...addressForm, telephone: e.target.value})} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Street Address</label>
              <input type="text" className="form-input" required value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})} />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label>Country</label>
                <select className="form-input" required value={addressForm.country_code} onChange={e => setAddressForm({...addressForm, country_code: e.target.value, region: '', region_id: ''})}>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.full_name_locale}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label>State / Province</label>
                {hasRegions ? (
                  <select className="form-input" required value={addressForm.region_id} onChange={e => setAddressForm({...addressForm, region_id: e.target.value})}>
                    <option value="">Please select a region, state or province</option>
                    {selectedCountry.available_regions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" className="form-input" value={addressForm.region} onChange={e => setAddressForm({...addressForm, region: e.target.value})} />
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label>City</label>
                <input type="text" className="form-input" required value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label>Zip / Postal Code</label>
                <input type="text" className="form-input" required value={addressForm.postcode} onChange={e => setAddressForm({...addressForm, postcode: e.target.value})} />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={addressForm.default_billing} onChange={e => setAddressForm({...addressForm, default_billing: e.target.checked})} /> Default Billing
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={addressForm.default_shipping} onChange={e => setAddressForm({...addressForm, default_shipping: e.target.checked})} /> Default Shipping
              </label>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Save Address</button>
              <button type="button" onClick={() => setIsEditingAddress(false)} className="btn-primary" style={{ width: 'auto', backgroundColor: '#e5e7eb', color: '#000' }}>Cancel</button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>Address Book</h3>
          <button onClick={() => openAddressEdit()} className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem' }}>Add New Address</button>
        </div>
        
        {addresses.length === 0 ? (
          <p style={{ marginTop: '1.5rem', color: 'var(--secondary-color)' }}>You have no saved addresses.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            {addresses.map(address => (
              <div key={address.id} style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', position: 'relative' }}>
                {address.default_billing && <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>DEFAULT BILLING</span>}
                {address.default_shipping && <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>DEFAULT SHIPPING</span>}
                
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>{address.firstname} {address.lastname}</p>
                <p style={{ margin: '0 0 0.25rem 0', color: 'var(--secondary-color)' }}>{address.street.join(', ')}</p>
                <p style={{ margin: '0 0 0.25rem 0', color: 'var(--secondary-color)' }}>{address.city}, {address.region?.region} {address.postcode}</p>
                <p style={{ margin: '0 0 1rem 0', color: 'var(--secondary-color)' }}>{address.country_code}</p>
                <p style={{ margin: '0 0 1.5rem 0', color: 'var(--secondary-color)' }}>T: {address.telephone}</p>
                
                <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <button onClick={() => openAddressEdit(address)} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: 0 }}>Edit</button>
                  <button onClick={() => handleDeleteAddress(address.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0 }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderEditProfile = () => (
    <div style={{ maxWidth: '500px' }}>
      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Edit Account Information</h3>
      <form onSubmit={handleUpdateProfile} style={{ marginTop: '1.5rem' }}>
        <div className="form-group">
          <label>First Name</label>
          <input type="text" className="form-input" required value={editForm.firstname} onChange={e => setEditForm({...editForm, firstname: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Last Name</label>
          <input type="text" className="form-input" required value={editForm.lastname} onChange={e => setEditForm({...editForm, lastname: e.target.value})} />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Save</button>
          <button type="button" onClick={() => setActiveTab('dashboard')} className="btn-primary" style={{ width: 'auto', backgroundColor: '#e5e7eb', color: '#000' }}>Cancel</button>
        </div>
      </form>
    </div>
  );

  const renderChangePassword = () => (
    <div style={{ maxWidth: '500px' }}>
      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Change Password</h3>
      <form onSubmit={handleChangePassword} style={{ marginTop: '1.5rem' }}>
        <div className="form-group">
          <label>Current Password</label>
          <input type="password" className="form-input" required value={passForm.currentPassword} onChange={e => setPassForm({...passForm, currentPassword: e.target.value})} />
        </div>
        <div className="form-group">
          <label>New Password</label>
          <input type="password" className="form-input" required value={passForm.newPassword} onChange={e => setPassForm({...passForm, newPassword: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Confirm New Password</label>
          <input type="password" className="form-input" required value={passForm.confirmPassword} onChange={e => setPassForm({...passForm, confirmPassword: e.target.value})} />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Save Password</button>
          <button type="button" onClick={() => setActiveTab('dashboard')} className="btn-primary" style={{ width: 'auto', backgroundColor: '#e5e7eb', color: '#000' }}>Cancel</button>
        </div>
      </form>
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', fontWeight: '700' }}>My Account</h1>

      <div className="category-layout">
        
        {/* Left Sidebar Navigation (Fully Static & Isolated from Reloads) */}
        <aside className="sidebar-nav">
          <ul className="filter-list" style={{ gap: '1rem' }}>
            <li className="filter-item" onClick={() => setActiveTab('dashboard')} style={{ fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal', color: activeTab === 'dashboard' ? 'var(--primary-color)' : 'var(--secondary-color)', cursor: 'pointer' }}>Account Dashboard</li>
            <li className="filter-item" onClick={() => setActiveTab('orders')} style={{ fontWeight: activeTab === 'orders' ? 'bold' : 'normal', color: activeTab === 'orders' ? 'var(--primary-color)' : 'var(--secondary-color)', cursor: 'pointer' }}>My Orders</li>
            <li className="filter-item" onClick={() => setActiveTab('downloads')} style={{ fontWeight: activeTab === 'downloads' ? 'bold' : 'normal', color: activeTab === 'downloads' ? 'var(--primary-color)' : 'var(--secondary-color)', cursor: 'pointer' }}>My Downloadable Products</li>
            <li className="filter-item" onClick={() => setActiveTab('address')} style={{ fontWeight: activeTab === 'address' ? 'bold' : 'normal', color: activeTab === 'address' ? 'var(--primary-color)' : 'var(--secondary-color)', cursor: 'pointer' }}>Address Book</li>
            <li className="filter-item" onClick={() => setActiveTab('edit')} style={{ fontWeight: activeTab === 'edit' ? 'bold' : 'normal', color: activeTab === 'edit' ? 'var(--primary-color)' : 'var(--secondary-color)', cursor: 'pointer' }}>Account Information</li>
          </ul>
        </aside>

        {/* Dynamic Main Content Container with Isolated Loader */}
        <div className="main-content" style={{ position: 'relative', minHeight: '300px' }}>
          
          {message.text && (
            <div style={{ 
              padding: '1rem', marginBottom: '1.5rem', borderRadius: '4px',
              backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce7',
              color: message.type === 'error' ? '#991b1b' : '#166534'
            }}>
              {message.text}
            </div>
          )}

          {actionLoading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(2px)',
              display: 'flex', justifyContent: 'center', paddingTop: '10%', borderRadius: 'var(--border-radius)'
            }}>
              <svg width="50" height="50" viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="20" fill="none" stroke="var(--accent-color)" strokeWidth="4" strokeDasharray="31.4 31.4" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="0.8s" values="0 25 25;360 25 25"/>
                </circle>
              </svg>
            </div>
          )}

          <div style={{ opacity: actionLoading ? 0.3 : 1, transition: 'opacity 0.2s ease-in-out' }}>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'edit' && renderEditProfile()}
            {activeTab === 'password' && renderChangePassword()}
            {activeTab === 'orders' && renderOrders()}
            {activeTab === 'downloads' && renderDownloads()}
            {activeTab === 'address' && renderAddressBook()}

            <button onClick={handleLogout} className="btn-primary" style={{ marginTop: '3rem', width: 'auto', backgroundColor: '#dc2626' }}>
              Sign Out
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}