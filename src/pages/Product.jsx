import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, gql } from 'urql';
import { useCart } from '../context/CartContext';

const GET_PDP = gql`
  query GetProductDetails($urlKey: String!) {
    products(filter: { url_key: { eq: $urlKey } }) {
      items {
        sku
        name
        description { html }
        media_gallery { url label }
        price_range {
          minimum_price {
            regular_price { value currency }
          }
        }
        categories {
          name
          url_path
          breadcrumbs {
            category_name
            category_url_path
          }
        }
      }
    }
  }
`;

export default function Product() {
  const { urlKey } = useParams();
  const cleanUrlKey = urlKey.replace('.html', ''); 

  const [result] = useQuery({ 
    query: GET_PDP, 
    variables: { urlKey: cleanUrlKey } 
  });
  
  const { data, fetching, error } = result;
  const { addToCart } = useCart();

  const [btnState, setBtnState] = useState('idle'); // 'idle' | 'adding' | 'added'
  const [successMessage, setSuccessMessage] = useState('');

  if (fetching) return <div style={{ padding: '2rem' }}>Loading product details...</div>;
  if (error) return <div style={{ padding: '2rem' }}>Error: {error.message}</div>;
  
  const product = data?.products?.items[0];
  if (!product) return <div style={{ padding: '2rem' }}>Product not found.</div>;

  const primaryCategory = product.categories?.[0];
  const breadcrumbs = primaryCategory?.breadcrumbs || [];

  const handleAddToCart = async () => {
    setBtnState('adding');
    const result = await addToCart(product.sku, 1);

    if (!result?.error) {
      setBtnState('added');
      setSuccessMessage(`Product added to cart: ${product.name} (SKU: ${product.sku})`);
      
      setTimeout(() => {
        setBtnState('idle');
      }, 2000);
    } else {
      setBtnState('idle');
    }
  };

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
    <div>
      <ul className="breadcrumbs">
        <li><Link to="/">Home</Link></li>
        {breadcrumbs.map((bc, index) => (
          <li key={index}>
            <Link to={`/c/${bc.category_url_path}`}>{bc.category_name}</Link>
          </li>
        ))}
        {primaryCategory && (
          <li>
            <Link to={`/c/${primaryCategory.url_path}`}>{primaryCategory.name}</Link>
          </li>
        )}
        <li className="current">{product.name}</li>
      </ul>

      {successMessage && (
        <div style={{ 
          padding: '1rem', marginBottom: '1.5rem', borderRadius: '4px',
          backgroundColor: '#dcfce7', color: '#166534', fontWeight: '500'
        }}>
          {successMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px' }}>
          {product.media_gallery?.[0]?.url ? (
            <img src={product.media_gallery[0].url} alt={product.name} style={{ width: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '100%', height: '400px', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image available</div>
          )}
        </div>
        
        <div style={{ flex: '1 1 400px' }}>
          <h1 style={{ margin: '0 0 10px 0' }}>{product.name}</h1>
          <p style={{ color: '#666', margin: '0 0 20px 0' }}>SKU: {product.sku}</p>
          <h2 style={{ margin: '0 0 20px 0' }}>
            {product.price_range.minimum_price.regular_price.currency} {product.price_range.minimum_price.regular_price.value}
          </h2>
          
          <div dangerouslySetInnerHTML={{ __html: product.description?.html }} style={{ margin: '20px 0', lineHeight: '1.6' }} />
          
          <button 
            onClick={handleAddToCart} 
            className="btn-primary"
            style={{ backgroundColor: btnBg, transition: 'background-color 0.3s ease' }}
            disabled={btnState === 'adding'}
          >
            {btnText}
          </button>
        </div>
      </div>
    </div>
  );
}