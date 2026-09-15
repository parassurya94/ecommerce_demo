import React, { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery, gql } from 'urql';
import { useCart } from '../context/CartContext';

const GET_CATEGORY = gql`
  query GetCategory($urlPath: String!) {
    categories(filters: { url_path: { eq: $urlPath } }) {
      items {
        uid
        name
        breadcrumbs {
          category_name
          category_url_path
        }
      }
    }
  }
`;

const GET_PRODUCTS = gql`
  query GetProducts($filter: ProductAttributeFilterInput!) {
    products(filter: $filter, pageSize: 12) {
      aggregations {
        attribute_code
        label
        options { label value count }
      }
      items {
        uid sku name url_key image { url }
        price_range { minimum_price { regular_price { value currency } } }
      }
    }
  }
`;

export default function Category() {
  const { urlPath } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();

  // Local state for motion button feedback and success banners
  const [buttonStates, setButtonStates] = useState({}); // { [uid]: 'idle' | 'adding' | 'added' }
  const [successMessage, setSuccessMessage] = useState('');

  const [{ data: catData, fetching: catFetching, error: catError }] = useQuery({ 
    query: GET_CATEGORY, 
    variables: { urlPath } 
  });
  
  const category = catData?.categories?.items[0];
  const categoryUid = category?.uid;

  const filterInput = {};
  if (categoryUid) {
    filterInput.category_uid = { eq: categoryUid };
  }
  
  searchParams.forEach((value, key) => {
    if (key === 'price') {
      const [from, to] = value.split('_');
      filterInput[key] = { from, to };
    } else {
      filterInput[key] = { eq: value };
    }
  });

  const [{ data: prodData, fetching: prodFetching, error: prodError }] = useQuery({ 
    query: GET_PRODUCTS, 
    variables: { filter: filterInput },
    pause: !categoryUid 
  });

  if (catFetching || (!prodData && prodFetching && !categoryUid)) {
    return <div style={{ padding: '2rem' }}>Loading category...</div>;
  }
  if (catError || prodError) {
    return <div style={{ padding: '2rem' }}>Error: {catError?.message || prodError?.message}</div>;
  }
  if (!category) return <div style={{ padding: '2rem' }}>Category not found.</div>;

  const aggregations = prodData?.products?.aggregations?.filter(
    agg => agg.attribute_code !== 'category_uid'
  ) || [];
  const products = prodData?.products?.items || [];
  const breadcrumbs = category.breadcrumbs || [];

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

  const hasActiveFilters = Array.from(searchParams.keys()).length > 0;
  const clearAllFilters = () => setSearchParams({});

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
      <ul className="breadcrumbs">
        <li><Link to="/">Home</Link></li>
        {breadcrumbs.map((bc, index) => (
          <li key={index}>
            <Link to={`/c/${bc.category_url_path}`}>{bc.category_name}</Link>
          </li>
        ))}
        <li className="current">{category.name}</li>
      </ul>

      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', fontWeight: '700' }}>
        {category.name}
      </h1>

      {successMessage && (
        <div style={{ 
          padding: '1rem', marginBottom: '1.5rem', borderRadius: '4px',
          backgroundColor: '#dcfce7', color: '#166534', fontWeight: '500'
        }}>
          {successMessage}
        </div>
      )}
      
      <div className="category-layout">
        <aside className="sidebar-nav">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Shop By</h3>
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
                      style={{ fontWeight: isActive ? '700' : '400', color: isActive ? 'var(--accent-color)' : 'var(--secondary-color)' }}
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
          <div className="product-grid" style={{ paddingTop: 0 }}>
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
                      ) : (<span>No Image</span>)}
                    </Link>
                    <div className="product-info">
                      <Link to={`/p/${product.url_key}.html`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h4 className="product-name">{product.name}</h4>
                      </Link>
                      <div className="product-price">
                        {product.price_range.minimum_price.regular_price.currency} {product.price_range.minimum_price.regular_price.value}
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
  );
}