import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-column">
          <h4>About Us</h4>
          <p style={{ lineHeight: '1.6', margin: 0 }}>
            We provide premium, 100% natural products crafted to support your daily wellness journey. Experience the purest ingredients delivered straight to your door.
          </p>
        </div>
        
        <div className="footer-column">
          <h4>Quick Links</h4>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
          </ul>
        </div>
        
        <div className="footer-column">
          <h4>Customer Service</h4>
          <ul className="footer-links">
            <li><Link to="/shipping">Shipping Policy</Link></li>
            <li><Link to="/returns">Returns & Refunds</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
          </ul>
        </div>
        
        <div className="footer-column">
          <h4>Newsletter</h4>
          <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Subscribe for the latest offers and health tips.</p>
          <form onSubmit={(e) => { e.preventDefault(); alert('Newsletter subscribed!'); }}>
            <input 
              type="email" 
              placeholder="Enter your email address" 
              className="newsletter-input"
              required 
            />
            <button type="submit" className="btn-primary" style={{ backgroundColor: '#2563eb' }}>
              Subscribe
            </button>
          </form>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} M2 Storefront. All rights reserved.</p>
      </div>
    </footer>
  );
}