import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery, gql } from 'urql';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const GET_CATEGORIES = gql`
  query GetCategories { 
    categoryList(filters: {ids: {eq: "2"}}) { 
      children { id name url_path } 
    } 
  }
`;

export default function Header() {
  const [result] = useQuery({ query: GET_CATEGORIES });
  const { data, fetching, error } = result;

  const { cartCount } = useCart();
  const { isAuthenticated } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');

  // Sync the search input with the URL depending on the current page
  useEffect(() => {
    if (location.pathname === '/search') {
      const currentQuery = searchParams.get('q');
      setSearchQuery(currentQuery || '');
    } else {
      setSearchQuery('');
    }
  }, [location.pathname, searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="site-header">
      <div className="header-container">
        <Link to="/" className="logo">M2 Storefront</Link>

        <form onSubmit={handleSearch} style={{ margin: 0 }}>
          <input
            type="text"
            placeholder="Search entire store here..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {isAuthenticated ? (
            <Link to="/customer/account" style={{ textDecoration: 'none', color: '#000', fontWeight: '500' }}>
              My Account
            </Link>
          ) : (
            <Link to="/customer/account/login" style={{ textDecoration: 'none', color: '#000', fontWeight: '500' }}>
              Sign In
            </Link>
          )}

          <div style={{ fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/cart" style={{ fontWeight: '600', textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Cart ({cartCount})
            </Link>
          </div>
        </div>
      </div>

      <nav className="nav-menu">
        {!fetching && !error && data?.categoryList[0]?.children.map(cat => (
          <Link key={cat.id} to={`/c/${cat.url_path}`} className="nav-link">
            {cat.name}
          </Link>
        ))}
      </nav>
    </header>
  );
}