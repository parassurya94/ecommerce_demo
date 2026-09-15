import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, gql } from 'urql';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/formatCurrency';

const GET_SEARCH_RESULTS = gql`
  query SearchProducts($search: String!, $filter: ProductAttributeFilterInput) {
    products(search: $search, filter: $filter, pageSize: 24) {
      total_count
      aggregations {
        attribute_code
        label
        options {
          label
          value
          count
        }
      }
      items {
        uid
        sku
        name
        url_key
        image { url }
        price_range {
          minimum_price {
            regular_price { value currency }
          }
        }
      }
    }
  }
`;

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { addToCart } = useCart();

  // Local state for motion button feedback and success banners
  const [buttonStates, setButtonStates] = useState({}); // { [uid]: 'idle' | 'adding' | 'added' }
  const [successMessage, setSuccessMessage] = useState('');

  const filterInput = {};
  searchParams.forEach((value, key) => {
    if (key !== 'q') {
      if (key === 'price') {
        const [from, to] = value.split('_');
        filterInput[key] = { from, to };
      } else {
        filterInput[key] = { eq: value };
      }
    }
  });

  const [result] = useQuery({ 
    query: GET_SEARCH_RESULTS, 
    variables: { 
      search: query,
      filter: Object.keys(filterInput).length > 0 ? filterInput : {} 
    },
    pause: !query 
  });
  
  const { data, fetching, error } = result;

  const aggregations = data?.products?.aggregations || [];
  const products = data?.products?.items || [];

  const handleFilterToggle = (attributeCode, value) => {
    setSearchParams(prevParams => {
      const currentVal = prevParams.get(attributeCode);
      if (currentVal === String(value)) {
        prevParams.delete(attributeCode);
      } else {
        prevParams.set(attributeCode, value);
      }
      return prevParams;
    });
  };

  const hasActiveFilters = Array.from(searchParams.keys()).some(key => key !== 'q');

  const clearAllFilters = () => {
    setSearchParams({ q: query });
  };

  const handleAddToCart = async (product) => {
    setButtonStates(prev => ({ ...prev, [product.uid]: 'adding' }));
    
    const result = await addToCart(product.sku, 1);
    
    if (!result?.error) {
      setButtonStates(prev => ({ ...prev, [product.uid]: 'added' }));
      setSuccessMessage(`Product added to cart: ${product.name} (SKU: ${product.sku})`);
      
      // Revert button back to normal after 2 seconds
      setTimeout(() => {
        setButtonStates(prev => ({ ...prev, [product.uid]: 'idle' }));
      }, 2000);
    } else {
      setButtonStates(prev => ({ ...prev, [product.uid]: 'idle' }));
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', fontWeight: '700' }}>
        Search Results for: "{query}"
      </h1>

      {successMessage && (
        <div style={{ 
          padding: '1rem', marginBottom: '1.5rem', borderRadius: '4px',
          backgroundColor: '#dcfce7', color: '#166534', fontWeight: '500'
        }}>
          {successMessage}
        </div>
      )}

      {error && <div style={{ padding: '2rem 0' }}>Error performing search: {error.message}</div>}
      
      {products.length === 0 && !fetching && !error && (
        <div style={{ padding: '2rem 0', fontSize: '1.2rem', color: 'var(--secondary-color)' }}>
          No products found matching your search criteria.
        </div>
      )}

      {(products.length > 0 || hasActiveFilters || fetching) && (
        <div className="category-layout">
          <aside className="sidebar-nav">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Filter Results</h3>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>
                  Clear All
                </button>
              )}
            </div>
            
            {aggregations.map((filter) => (
              <div key={filter.attribute_code} className="filter-block">
                <h4 className="filter-title">{filter.label}</h4>
                <ul className="filter-list">
                  {filter.options.map((option) => {
                    const isActive = searchParams.get(filter.attribute_code) === String(option.value);
                    return (
                      <li 
                        key={option.value} 
                        className="filter-item" 
                        onClick={() => handleFilterToggle(filter.attribute_code, option.value)}
                        style={{ 
                          fontWeight: isActive ? '700' : '400',
                          color: isActive ? 'var(--accent-color)' : 'var(--secondary-color)'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isActive && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-color)' }}></span>}
                          {option.label}
                        </span>
                        <span className="filter-count">{option.count}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </aside>

          <div className="main-content">
            <p style={{ color: 'var(--secondary-color)', marginBottom: '1.5rem', marginTop: 0 }}>
              Found {data?.products?.total_count || 0} items
            </p>
            
            <div style={{ position: 'relative', minHeight: '300px' }}>
              {fetching && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  backgroundColor: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(2px)',
                  display: 'flex', justifyContent: 'center', paddingTop: '10%'
                }}>
                  <svg width="50" height="50" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="var(--accent-color)" strokeWidth="4" strokeDasharray="31.4 31.4" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="0.8s" values="0 25 25;360 25 25"/>
                    </circle>
                  </svg>
                </div>
              )}

              <div className="product-grid" style={{ paddingTop: 0, opacity: fetching ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                {products.map(product => {
                  const btnState = buttonStates[product.uid] || 'idle';
                  
                  let btnText = 'Add to Cart';
                  let btnBg = 'var(--primary-color)';
                  if (btnState === 'adding') {
                    btnText = 'Adding...';
                    btnBg = '#4b5563';
                  } else if (btnState === 'added') {
                    btnText = 'Added to Cart ✓';
                    btnBg = '#166534';
                  }

                  return (
                    <div key={product.uid} className="product-card">
                      <div style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Link to={`/p/${product.url_key}.html`} className="product-image-container">
                          {product.image?.url ? (
                            <img src={`https://wsrv.nl/?url=${encodeURIComponent(product.image.url)}`} alt={product.name} className="product-image" />
                          ) : (
                            <span>No Image</span>
                          )}
                        </Link>
                        
                        <div className="product-info">
                          <Link to={`/p/${product.url_key}.html`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <h4 className="product-name">{product.name}</h4>
                          </Link>
                          <div className="product-price">
                            {formatCurrency(product.price_range.minimum_price.regular_price.value, product.price_range.minimum_price.regular_price.currency)}
                          </div>
                          <div style={{ marginTop: 'auto' }}>
                            <button 
                              className="btn-primary" 
                              style={{ backgroundColor: btnBg, transition: 'background-color 0.3s ease' }}
                              disabled={btnState === 'adding'}
                              onClick={(e) => {
                                e.preventDefault(); 
                                handleAddToCart(product);
                              }}
                            >
                              {btnText}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}