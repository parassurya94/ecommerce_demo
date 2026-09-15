import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useMutation, useQuery, gql } from 'urql';
import { formatCurrency } from '../utils/formatCurrency';

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

const CREATE_CART = gql`
  mutation CreateEmptyCart {
    createEmptyCart
  }
`;

const APPLY_COUPON = gql`
  mutation ApplyCoupon($cartId: String!, $couponCode: String!) {
    applyCouponToCart(input: { cart_id: $cartId, coupon_code: $couponCode }) {
      cart {
        applied_coupons { code }
        prices {
          subtotal_excluding_tax { value currency }
          discounts {
            label
            amount { value currency }
          }
          grand_total { value currency }
        }
      }
    }
  }
`;

const REMOVE_COUPON = gql`
  mutation RemoveCoupon($cartId: String!) {
    removeCouponFromCart(input: { cart_id: $cartId }) {
      cart {
        applied_coupons { code }
        prices {
          subtotal_excluding_tax { value currency }
          discounts {
            label
            amount { value currency }
          }
          grand_total { value currency }
        }
      }
    }
  }
`;

const SET_SHIPPING_ADDRESS = gql`
  mutation SetShippingAddress($cartId: String!, $input: [ShippingAddressInput!]!) {
    setShippingAddressesOnCart(input: { cart_id: $cartId, shipping_addresses: $input }) {
      cart {
        shipping_addresses {
          selected_shipping_method {
            carrier_title
            method_title
            amount { value currency }
          }
          available_shipping_methods {
            carrier_code
            method_code
            carrier_title
            method_title
            amount { value currency }
          }
        }
        prices {
          subtotal_excluding_tax { value currency }
          discounts {
            label
            amount { value currency }
          }
          grand_total { value currency }
        }
      }
    }
  }
`;

const SET_SHIPPING_METHOD = gql`
  mutation SetShippingMethod($cartId: String!, $carrierCode: String!, $methodCode: String!) {
    setShippingMethodsOnCart(
      input: {
        cart_id: $cartId
        shipping_methods: [{ carrier_code: $carrierCode, method_code: $methodCode }]
      }
    ) {
      cart {
        shipping_addresses {
          selected_shipping_method {
            carrier_title
            method_title
            amount { value currency }
          }
        }
        prices {
          subtotal_excluding_tax { value currency }
          discounts {
            label
            amount { value currency }
          }
          grand_total { value currency }
        }
      }
    }
  }
`;

export default function Cart() {
  const { cartData, updateQuantity, removeItem, fetching, cartId, refetchCart } = useCart();
  
  const [{ data: countriesData }] = useQuery({ query: GET_COUNTRIES });
  const countries = countriesData?.countries || [];

  const [couponCode, setCouponCode] = useState('');
  const [isCouponOpen, setIsCouponOpen] = useState(true); 
  const [isEstimateOpen, setIsEstimateOpen] = useState(true);
  
  // Independent States for Coupons and Shipping
  const [couponMessage, setCouponMessage] = useState({ type: '', text: '' });
  const [shippingMessage, setShippingMessage] = useState({ type: '', text: '' });
  const [couponLoading, setCouponLoading] = useState(false);
  const [shippingLoading, setShippingLoading] = useState(false);
  
  const [isInitializing, setIsInitializing] = useState(true);

  // Shipping Estimation Form State
  const [shippingForm, setShippingForm] = useState({
    country_code: 'US',
    region: '',
    region_id: '12',
    postcode: '90210'
  });

  const [, createEmptyCart] = useMutation(CREATE_CART);
  const [, executeApplyCoupon] = useMutation(APPLY_COUPON);
  const [, executeRemoveCoupon] = useMutation(REMOVE_COUPON);
  const [, executeSetShippingAddress] = useMutation(SET_SHIPPING_ADDRESS);
  const [, executeSetShippingMethod] = useMutation(SET_SHIPPING_METHOD);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 400); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchDefaultShipping = async () => {
      if (cartId && cartData?.items?.length > 0 && !cartData?.shipping_addresses?.[0]?.selected_shipping_method) {
        try {
          const result = await executeSetShippingAddress({
            cartId,
            input: [{
              address: {
                country_code: 'US',
                postcode: '90210',
                region: 'California',
                region_id: 12,
                firstname: 'Default',
                lastname: 'User',
                street: ['123 Default St'],
                city: 'Los Angeles',
                telephone: '1234567890'
              }
            }]
          });

          if (!result.error) {
            const methods = result.data?.setShippingAddressesOnCart?.cart?.shipping_addresses?.[0]?.available_shipping_methods;
            if (methods && methods.length > 0) {
              await executeSetShippingMethod({
                cartId,
                carrierCode: methods[0].carrier_code,
                methodCode: methods[0].method_code
              });
              refetchCart({ requestPolicy: 'network-only' });
            }
          }
        } catch (err) {
          console.error("Error setting default shipping:", err);
        }
      }
    };

    fetchDefaultShipping();
  }, [cartId, cartData?.items?.length]);

  if (isInitializing || fetching || (cartId && !cartData)) {
    return (
      <div style={{ padding: '6rem 0', textAlign: 'center' }}>
        <svg width="50" height="50" viewBox="0 0 50 50" style={{ marginBottom: '1rem' }}>
          <circle cx="25" cy="25" r="20" fill="none" stroke="var(--accent-color)" strokeWidth="4" strokeDasharray="31.4 31.4" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="0.8s" values="0 25 25;360 25 25"/>
          </circle>
        </svg>
        <p style={{ color: 'var(--secondary-color)', fontSize: '1.1rem' }}>Loading your shopping cart...</p>
      </div>
    );
  }

  const items = cartData?.items || [];
  const prices = cartData?.prices;
  const appliedCoupon = cartData?.applied_coupons?.[0]?.code;
  const shippingAddressInfo = cartData?.shipping_addresses?.[0];
  const selectedShipping = shippingAddressInfo?.selected_shipping_method;
  const availableMethods = shippingAddressInfo?.available_shipping_methods || [];

  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    if (!couponCode.trim()) {
      setCouponMessage({ type: 'validation', text: 'This is a required field.' });
      return;
    }

    setCouponMessage({ type: '', text: '' });
    setCouponLoading(true);

    try {
      let activeCartId = cartId || cartData?.id || localStorage.getItem('magento_cart_id');
      if (!activeCartId) {
        const createRes = await createEmptyCart();
        activeCartId = createRes.data?.createEmptyCart;
        if (activeCartId) {
          localStorage.setItem('magento_cart_id', activeCartId);
        } else {
          setCouponMessage({ type: 'error', text: 'Could not initialize cart session.' });
          setCouponLoading(false);
          return;
        }
      }

      const result = await executeApplyCoupon({ cartId: activeCartId, couponCode: couponCode.trim() });
      
      if (result.error) {
        setCouponMessage({ type: 'error', text: result.error.message.replace('[GraphQL] ', '') });
      } else {
        setCouponMessage({ type: 'success', text: `You used coupon "${couponCode}".` });
        setCouponCode('');
        refetchCart({ requestPolicy: 'network-only' });
      }
    } catch (err) {
      console.error('Coupon application error:', err);
      setCouponMessage({ type: 'error', text: 'Failed to apply coupon code.' });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async (e) => {
    if (e) e.preventDefault();
    
    const activeCartId = cartId || cartData?.id || localStorage.getItem('magento_cart_id');
    if (!activeCartId) {
      setCouponMessage({ type: 'error', text: 'Cart session is missing. Please refresh.' });
      return;
    }
    
    setCouponMessage({ type: '', text: '' });
    setCouponLoading(true);

    try {
      const result = await executeRemoveCoupon({ cartId: activeCartId });
      
      if (result.error) {
        setCouponMessage({ type: 'error', text: result.error.message.replace('[GraphQL] ', '') });
      } else {
        setCouponCode('');
        refetchCart({ requestPolicy: 'network-only' });
      }
    } catch (error) {
      console.error('Remove coupon error:', error);
      setCouponMessage({ type: 'error', text: 'Failed to remove discount.' });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleEstimateShipping = async () => {
    setShippingLoading(true);
    setShippingMessage({ type: '', text: '' });

    try {
      let activeCartId = cartId || cartData?.id || localStorage.getItem('magento_cart_id');
      if (!activeCartId) {
        const createRes = await createEmptyCart();
        activeCartId = createRes.data?.createEmptyCart;
        if (activeCartId) {
          localStorage.setItem('magento_cart_id', activeCartId);
        } else {
          setShippingMessage({ type: 'error', text: 'Could not initialize cart session.' });
          setShippingLoading(false);
          return;
        }
      }

      if (!shippingForm.postcode) {
        setShippingMessage({ type: 'error', text: 'Please enter a Zip/Postal Code.' });
        setShippingLoading(false);
        return;
      }

      const selectedCountry = countries.find(c => c.id === shippingForm.country_code);
      const hasRegions = selectedCountry?.available_regions && selectedCountry.available_regions.length > 0;

      const addressPayload = {
        country_code: shippingForm.country_code,
        postcode: shippingForm.postcode.trim(),
        firstname: 'Estimate',
        lastname: 'User',
        street: ['123 Estimate St'],
        city: 'Estimate City',
        telephone: '0000000000'
      };

      if (hasRegions) {
        if (shippingForm.region_id) {
          addressPayload.region_id = parseInt(shippingForm.region_id);
        }
      } else {
        addressPayload.region = shippingForm.region || 'Default Region';
      }

      const result = await executeSetShippingAddress({
        cartId: activeCartId,
        input: [{ address: addressPayload }]
      });

      if (result.error) {
        setShippingMessage({ type: 'error', text: result.error.message.replace('[GraphQL] ', '') });
      } else {
        const methods = result.data?.setShippingAddressesOnCart?.cart?.shipping_addresses?.[0]?.available_shipping_methods;
        if (methods && methods.length > 0) {
          await executeSetShippingMethod({
            cartId: activeCartId,
            carrierCode: methods[0].carrier_code,
            methodCode: methods[0].method_code
          });
        }
        refetchCart({ requestPolicy: 'network-only' });
        setShippingMessage({ type: 'success', text: 'Shipping quotes calculated successfully!' });
      }
    } catch (err) {
      console.error('Shipping estimation error caught:', err);
      setShippingMessage({ type: 'error', text: 'Failed to calculate shipping quotes.' });
    } finally {
      setShippingLoading(false);
    }
  };

  const handleSelectShippingMethod = async (carrierCode, methodCode) => {
    const activeCartId = cartId || cartData?.id || localStorage.getItem('magento_cart_id');
    if (!activeCartId) return;
    
    setShippingLoading(true);
    const result = await executeSetShippingMethod({ cartId: activeCartId, carrierCode, methodCode });
    setShippingLoading(false);
    if (!result.error) {
      refetchCart({ requestPolicy: 'network-only' });
    }
  };

  if (items.length === 0) {
    return (
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Shopping Cart is Empty</h1>
        <p style={{ color: 'var(--secondary-color)', marginBottom: '2rem' }}>You have no items in your shopping cart.</p>
        <Link to="/" className="btn-primary" style={{ display: 'inline-block', width: 'auto' }}>
          Continue Shopping
        </Link>
      </div>
    );
  }

  const selectedCountryObj = countries.find(c => c.id === shippingForm.country_code);
  const countryHasRegions = selectedCountryObj?.available_regions && selectedCountryObj.available_regions.length > 0;

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', fontWeight: '700' }}>Shopping Cart</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Left Side: Items Table & Discount Accordion */}
        <div>
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: '1.5rem', marginBottom: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ paddingBottom: '1rem' }}>Item</th>
                  <th style={{ paddingBottom: '1rem' }}>Price</th>
                  <th style={{ paddingBottom: '1rem' }}>Qty</th>
                  <th style={{ paddingBottom: '1rem', textAlign: 'right' }}>Subtotal</th>
                  <th style={{ paddingBottom: '1rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.uid} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1.5rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      {item.product.image?.url ? (
                        <img src={`https://wsrv.nl/?url=${encodeURIComponent(item.product.image.url)}`} alt={item.product.name} style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ width: '60px', height: '60px', background: '#f5f5f5' }}></div>
                      )}
                      <div>
                        <Link to={`/p/${item.product.url_key}.html`} style={{ fontWeight: '600', color: 'var(--primary-color)', textDecoration: 'none' }}>
                          {item.product.name}
                        </Link>
                        <div style={{ fontSize: '0.85rem', color: 'var(--secondary-color)' }}>SKU: {item.product.sku}</div>
                      </div>
                    </td>

                    <td>
                      {formatCurrency(item.prices.price.value, item.prices.price.currency)}
                    </td>

                    <td>
                      <input 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val > 0) updateQuantity(item.uid, val);
                        }}
                        style={{ width: '60px', padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center' }} 
                      />
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: '600' }}>
                      {formatCurrency(item.prices.row_total.value, item.prices.row_total.currency)}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => removeItem(item.uid)} 
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: '600', fontSize: '1.2rem' }}
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Magento-style Apply Discount Code Accordion */}
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
            <div 
              onClick={() => setIsCouponOpen(!isCouponOpen)}
              style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: '600', backgroundColor: '#f9fafb' }}
            >
              <span>Apply Discount Code</span>
              <span>{isCouponOpen ? '▲' : '▼'}</span>
            </div>

            {isCouponOpen && (
              <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                {couponMessage.type !== 'validation' && couponMessage.text && (
                  <div style={{ 
                    padding: '0.75rem', marginBottom: '1rem', borderRadius: '4px', fontSize: '0.9rem',
                    backgroundColor: couponMessage.type === 'error' ? '#fee2e2' : '#dcfce7',
                    color: couponMessage.type === 'error' ? '#991b1b' : '#166534'
                  }}>
                    {couponMessage.text}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <input 
                      type="text" 
                      placeholder="Enter discount code" 
                      value={appliedCoupon ? appliedCoupon : couponCode} 
                      onChange={e => {
                        if (!appliedCoupon) setCouponCode(e.target.value);
                        setCouponMessage({ type: '', text: '' }); 
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!appliedCoupon) handleApplyCoupon();
                        }
                      }}
                      disabled={!!appliedCoupon || couponLoading}
                      className="form-input"
                      style={{ 
                        margin: 0,
                        backgroundColor: appliedCoupon ? '#f3f4f6' : '#fff',
                        color: appliedCoupon ? '#6b7280' : '#000',
                        cursor: appliedCoupon ? 'not-allowed' : 'text',
                        borderColor: couponMessage.type === 'validation' ? '#e02b27' : 'var(--border-color)'
                      }}
                    />
                    {couponMessage.type === 'validation' && (
                      <span style={{ color: '#e02b27', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                        {couponMessage.text}
                      </span>
                    )}
                  </div>
                  
                  {appliedCoupon ? (
                    <button 
                      type="button" 
                      onClick={handleRemoveCoupon} 
                      disabled={couponLoading} 
                      className="btn-primary" 
                      style={{ width: 'auto', padding: '0.5rem 1rem', backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
                    >
                      {couponLoading ? 'Canceling...' : 'Cancel Discount'}
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={handleApplyCoupon}
                      disabled={couponLoading} 
                      className="btn-primary" 
                      style={{ width: 'auto', padding: '0.5rem 1rem' }}
                    >
                      {couponLoading ? 'Applying...' : 'Apply Discount'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Magento-style Cart Summary Panel */}
        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Summary</h3>
          
          {/* Estimate Shipping and Tax Accordion Dropdown */}
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <div 
              onClick={() => setIsEstimateOpen(!isEstimateOpen)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem' }}
            >
              <span>Estimate Shipping and Tax</span>
              <span>{isEstimateOpen ? '▲' : '▼'}</span>
            </div>

            {isEstimateOpen && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                
                {/* Independent Shipping Message */}
                {shippingMessage.text && (
                  <div style={{ 
                    padding: '0.75rem', marginBottom: '0.5rem', borderRadius: '4px', fontSize: '0.9rem',
                    backgroundColor: shippingMessage.type === 'error' ? '#fee2e2' : '#dcfce7',
                    color: shippingMessage.type === 'error' ? '#991b1b' : '#166534'
                  }}>
                    {shippingMessage.text}
                  </div>
                )}

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.85rem' }}>Country</label>
                  <select 
                    className="form-input" 
                    value={shippingForm.country_code} 
                    onChange={e => setShippingForm({ ...shippingForm, country_code: e.target.value, region: '', region_id: '' })}
                    style={{ padding: '0.5rem' }}
                  >
                    {countries.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name_locale}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.85rem' }}>State/Province</label>
                  {countryHasRegions ? (
                    <select 
                      className="form-input" 
                      value={shippingForm.region_id} 
                      onChange={e => setShippingForm({ ...shippingForm, region_id: e.target.value })}
                      style={{ padding: '0.5rem' }}
                    >
                      <option value="">Please select a region, state or province</option>
                      {selectedCountryObj?.available_regions?.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      className="form-input" 
                      value={shippingForm.region} 
                      onChange={e => setShippingForm({ ...shippingForm, region: e.target.value })}
                      style={{ padding: '0.5rem' }}
                    />
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.85rem' }}>Zip/Postal Code</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={shippingForm.postcode} 
                    onChange={e => setShippingForm({ ...shippingForm, postcode: e.target.value })}
                    style={{ padding: '0.5rem' }}
                  />
                </div>

                <button 
                  type="button" 
                  disabled={shippingLoading} 
                  onClick={handleEstimateShipping}
                  className="btn-primary" 
                  style={{ padding: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  {shippingLoading ? 'Calculating...' : 'Get Quotes'}
                </button>

                {availableMethods.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Select Shipping Method:</label>
                    {availableMethods.map((method, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', fontSize: '0.85rem' }}>
                        <input 
                          type="radio" 
                          name="shipping_method"
                          checked={selectedShipping?.method_code === method.method_code}
                          onChange={() => handleSelectShippingMethod(method.carrier_code, method.method_code)}
                        />
                        <span>{method.carrier_title} - {method.method_title} ({formatCurrency(method.amount.value, method.amount.currency)})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--secondary-color)' }}>
            <span>Subtotal</span>
            <span>{formatCurrency(prices?.subtotal_excluding_tax?.value, prices?.subtotal_excluding_tax?.currency)}</span>
          </div>

          {selectedShipping ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--secondary-color)' }}>
              <span>Shipping ({selectedShipping.carrier_title} - {selectedShipping.method_title})</span>
              <span>{formatCurrency(selectedShipping.amount.value, selectedShipping.amount.currency)}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--secondary-color)' }}>
              <span>Shipping (Flat Rate - Fixed)</span>
              <span>{formatCurrency(10, 'USD')}</span>
            </div>
          )}

          {prices?.discounts?.map((discount, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#166534' }}>
              <span>Discount ({discount.label || 'Applied'})</span>
              <span>-{formatCurrency(discount.amount?.value, discount.amount?.currency)}</span>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontWeight: '700', fontSize: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <span>Order Total</span>
            <span>{formatCurrency(prices?.grand_total?.value, prices?.grand_total?.currency)}</span>
          </div>

          <button onClick={() => alert('Proceed to Checkout action triggered.')} className="btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>
            Proceed to Checkout
          </button>
          
          <div style={{ textAlign: 'center' }}>
            <a href="#multiple" onClick={(e) => { e.preventDefault(); alert('Multiple addresses checkout requires multi-shipping setup.'); }} style={{ fontSize: '0.85rem', color: 'var(--accent-color)', textDecoration: 'none' }}>
              Check Out with Multiple Addresses
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}