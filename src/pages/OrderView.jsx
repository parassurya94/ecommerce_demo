import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, gql } from 'urql';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/formatCurrency';

const GET_ORDER_DETAILS = gql`
  query GetOrderDetails($orderNumber: String!) {
    customer {
      orders(filter: { number: { eq: $orderNumber } }) {
        items {
          id
          number
          order_date
          status
          shipping_method
          payment_methods { name }
          shipping_address {
            firstname lastname street city region postcode country_code telephone
          }
          billing_address {
            firstname lastname street city region postcode country_code telephone
          }
          items {
            id
            product_name
            product_sku
            quantity_ordered
            product_sale_price { value currency }
          }
          total {
            subtotal { value currency }
            shipping_handling { total_amount { value currency } }
            taxes { amount { value currency } }
            grand_total { value currency }
          }
        }
      }
    }
  }
`;

const REORDER_MUTATION = gql`
  mutation Reorder($orderNumber: String!) {
    reorderItems(orderNumber: $orderNumber) {
      cart { total_quantity }
      userInputErrors { message }
    }
  }
`;

export default function OrderView() {
  const { orderNumber } = useParams();
  const { isAuthenticated } = useAuth();
  const { setCartCount } = useCart();
  const navigate = useNavigate();
  
  const [message, setMessage] = useState({ type: '', text: '' });
  const [reorderState, setReorderState] = useState('idle'); // 'idle' | 'adding' | 'added'

  useEffect(() => {
    if (!isAuthenticated) navigate('/customer/account/login');
  }, [isAuthenticated, navigate]);

  const [{ data, fetching, error }] = useQuery({ 
    query: GET_ORDER_DETAILS, 
    variables: { orderNumber },
    pause: !isAuthenticated 
  });

  const [, executeReorder] = useMutation(REORDER_MUTATION);

  if (fetching) return <div style={{ padding: '2rem' }}>Loading order details...</div>;
  if (error) return <div style={{ padding: '2rem' }}>Error loading order: {error.message}</div>;

  const order = data?.customer?.orders?.items?.[0];
  if (!order) return <div style={{ padding: '2rem' }}>Order not found.</div>;

  const handlePrint = () => window.print();

  const handleReorder = async () => {
    setMessage({ type: '', text: '' });
    setReorderState('adding');

    const result = await executeReorder({ orderNumber });
    
    if (result.error) {
      setReorderState('idle');
      setMessage({ type: 'error', text: result.error.message.replace('[GraphQL] ', '') });
    } else if (result.data?.reorderItems?.userInputErrors?.length > 0) {
      setReorderState('idle');
      setMessage({ type: 'error', text: result.data.reorderItems.userInputErrors[0].message });
    } else {
      setReorderState('added');
      setCartCount(result.data.reorderItems.cart.total_quantity);
      setMessage({ type: 'success', text: `Order #${order.number} items have been successfully added to your cart.` });
      window.scrollTo(0, 0);

      setTimeout(() => {
        setReorderState('idle');
      }, 3000);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      alert('Cancel Order action requires a custom Magento 2 backend extension. Mutation not available natively.');
    }
  };

  const navigateToTab = (tabName) => {
    navigate('/customer/account', { state: { activeTab: tabName } });
  };

  let reorderBtnText = 'Reorder';
  let reorderBtnBg = 'var(--primary-color)';
  if (reorderState === 'adding') {
    reorderBtnText = 'Reordering...';
    reorderBtnBg = '#4b5563';
  } else if (reorderState === 'added') {
    reorderBtnText = 'Reordered ✓';
    reorderBtnBg = '#166534';
  }

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', fontWeight: '700' }}>Order # {order.number}</h1>

      {message.text && (
        <div style={{ 
          padding: '1rem', marginBottom: '2rem', borderRadius: 'var(--border-radius)',
          backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: message.type === 'error' ? '#991b1b' : '#166534',
          fontWeight: '500'
        }}>
          {message.text}
        </div>
      )}

      <div className="category-layout">
        
        {/* Left Sidebar Navigation */}
        <aside className="sidebar-nav no-print">
          <ul className="filter-list" style={{ gap: '1rem' }}>
            <li className="filter-item" onClick={() => navigateToTab('dashboard')} style={{ fontWeight: 'normal', color: 'var(--secondary-color)', cursor: 'pointer' }}>Account Dashboard</li>
            <li className="filter-item" onClick={() => navigateToTab('orders')} style={{ fontWeight: 'bold', color: 'var(--primary-color)', cursor: 'pointer' }}>My Orders</li>
            <li className="filter-item" onClick={() => navigateToTab('downloads')} style={{ fontWeight: 'normal', color: 'var(--secondary-color)', cursor: 'pointer' }}>My Downloadable Products</li>
            <li className="filter-item" onClick={() => navigateToTab('address')} style={{ fontWeight: 'normal', color: 'var(--secondary-color)', cursor: 'pointer' }}>Address Book</li>
            <li className="filter-item" onClick={() => navigateToTab('edit')} style={{ fontWeight: 'normal', color: 'var(--secondary-color)', cursor: 'pointer' }}>Account Information</li>
          </ul>
        </aside>

        {/* Main Content Area */}
        <div className="main-content">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
            <div>
              <span style={{ 
                padding: '0.25rem 0.75rem', 
                backgroundColor: order.status === 'Pending' ? '#fef3c7' : '#dcfce7', 
                color: order.status === 'Pending' ? '#92400e' : '#166534',
                borderRadius: '99px',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}>
                {order.status}
              </span>
              <span style={{ marginLeft: '1rem', color: 'var(--secondary-color)' }}>
                Placed on {order.order_date}
              </span>
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem' }} className="no-print">
              <button 
                onClick={handleReorder} 
                className="btn-primary" 
                style={{ width: 'auto', padding: '0.5rem 1rem', backgroundColor: reorderBtnBg, transition: 'background-color 0.3s ease' }}
                disabled={reorderState === 'adding'}
              >
                {reorderBtnText}
              </button>
              <button onClick={handlePrint} className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem', backgroundColor: '#4b5563' }}>Print Order</button>
              {order.status === 'Pending' && (
                <button onClick={handleCancel} className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem', backgroundColor: '#dc2626' }}>Cancel Order</button>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Items Ordered</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem 0' }}>Product Name</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem 0', fontWeight: '500' }}>{item.product_name}</td>
                    <td style={{ color: 'var(--secondary-color)' }}>{item.product_sku}</td>
                    <td>{formatCurrency(item.product_sale_price.value, item.product_sale_price.currency)}</td>
                    <td>{item.quantity_ordered}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>
                      {formatCurrency(item.product_sale_price.value * item.quantity_ordered, item.product_sale_price.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Order Information Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
            
            {order.shipping_address && (
              <div>
                <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: '0 0 1rem 0' }}>Shipping Address</h4>
                <p style={{ margin: '0 0 0.25rem 0' }}>{order.shipping_address.firstname} {order.shipping_address.lastname}</p>
                <p style={{ margin: '0 0 0.25rem 0', color: 'var(--secondary-color)' }}>{order.shipping_address.street.join(', ')}</p>
                <p style={{ margin: '0 0 0.25rem 0', color: 'var(--secondary-color)' }}>{order.shipping_address.city}, {order.shipping_address.region} {order.shipping_address.postcode}</p>
                <p style={{ margin: '0 0 0.25rem 0', color: 'var(--secondary-color)' }}>{order.shipping_address.country_code}</p>
                <p style={{ margin: '0', color: 'var(--secondary-color)' }}>T: {order.shipping_address.telephone}</p>
              </div>
            )}

            {order.shipping_method && (
              <div>
                <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: '0 0 1rem 0' }}>Shipping Method</h4>
                <p style={{ margin: 0, color: 'var(--secondary-color)' }}>{order.shipping_method}</p>
              </div>
            )}

            {order.billing_address && (
              <div>
                <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: '0 0 1rem 0' }}>Billing Address</h4>
                <p style={{ margin: '0 0 0.25rem 0' }}>{order.billing_address.firstname} {order.billing_address.lastname}</p>
                <p style={{ margin: '0 0 0.25rem 0', color: 'var(--secondary-color)' }}>{order.billing_address.street.join(', ')}</p>
                <p style={{ margin: '0 0 0.25rem 0', color: 'var(--secondary-color)' }}>{order.billing_address.city}, {order.billing_address.region} {order.billing_address.postcode}</p>
                <p style={{ margin: '0 0 0.25rem 0', color: 'var(--secondary-color)' }}>{order.billing_address.country_code}</p>
                <p style={{ margin: '0', color: 'var(--secondary-color)' }}>T: {order.billing_address.telephone}</p>
              </div>
            )}

            {order.payment_methods?.length > 0 && (
              <div>
                <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: '0 0 1rem 0' }}>Payment Method</h4>
                <p style={{ margin: 0, color: 'var(--secondary-color)' }}>{order.payment_methods[0].name}</p>
              </div>
            )}

          </div>

          {/* Order Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2rem', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)' }}>
            <table style={{ width: '300px', textAlign: 'right' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--secondary-color)' }}>Subtotal</td>
                  <td style={{ padding: '0.5rem 0' }}>{formatCurrency(order.total.subtotal.value, order.total.subtotal.currency)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--secondary-color)' }}>Shipping & Handling</td>
                  <td style={{ padding: '0.5rem 0' }}>{formatCurrency(order.total.shipping_handling?.total_amount.value, order.total.shipping_handling?.total_amount.currency)}</td>
                </tr>
                {order.total.taxes?.map((tax, i) => (
                  <tr key={i}>
                    <td style={{ padding: '0.5rem 0', color: 'var(--secondary-color)' }}>Tax</td>
                    <td style={{ padding: '0.5rem 0' }}>{formatCurrency(tax.amount.value, tax.amount.currency)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: '700', fontSize: '1.2rem' }}>
                  <td style={{ padding: '1rem 0 0 0' }}>Grand Total</td>
                  <td style={{ padding: '1rem 0 0 0' }}>{formatCurrency(order.total.grand_total.value, order.total.grand_total.currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}