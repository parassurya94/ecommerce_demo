import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home-container">
      
      {/* Hero Slider / Main Banner */}
      <div className="hero-banner">
        <img 
          src="https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=1600&q=80" 
          alt="Fresh Juice" 
          className="hero-image"
        />
        <div className="hero-content">
          <h2 style={{ fontSize: '2.5rem', marginTop: 0, marginBottom: '1rem', color: '#111827' }}>
            Fresh Juice
          </h2>
          <p style={{ fontSize: '1.2rem', color: '#4b5563', marginBottom: '2rem', lineHeight: '1.5' }}>
            Revitalize your mornings with our 100% organic, cold-pressed herbal blends. No artificial additives, just pure nature.
          </p>
          <Link to="/c/wellness-drinks" className="btn-primary" style={{ display: 'inline-block', width: 'auto' }}>
            Shop the Collection
          </Link>
        </div>
      </div>

      {/* Promotional Banners Grid */}
      <div className="promo-grid">
        
        {/* Banner 1 */}
        <Link to="/c/immunity" className="promo-banner">
          <img 
            src="https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=600&q=80" 
            alt="Immunity Boosters" 
            className="promo-image"
          />
          <h3 className="promo-text">Immunity Boosters</h3>
        </Link>
        
        {/* Banner 2 */}
        <Link to="/c/detox" className="promo-banner">
          <img 
            src="https://images.unsplash.com/photo-1628557044797-f21a177c37ec?auto=format&fit=crop&w=600&q=80" 
            alt="Detox & Cleanse" 
            className="promo-image"
          />
          <h3 className="promo-text">Detox & Cleanse</h3>
        </Link>

        {/* Banner 3 */}
        <Link to="/c/supplements" className="promo-banner">
          <img 
            src="https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?auto=format&fit=crop&w=600&q=80" 
            alt="Natural Supplements" 
            className="promo-image"
          />
          <h3 className="promo-text">Natural Supplements</h3>
        </Link>

      </div>
      
    </div>
  );
}