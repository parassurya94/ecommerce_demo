import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, gql } from 'urql';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const LOGIN_MUTATION = gql`
  mutation GenerateCustomerToken($email: String!, $password: String!) {
    generateCustomerToken(email: $email, password: $password) {
      token
    }
  }
`;

const ASSIGN_CART_MUTATION = gql`
  mutation AssignCart($cartId: String!) {
    assignCustomerToCart(cartId: $cartId) {
      id
    }
  }
`;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [{}, executeLogin] = useMutation(LOGIN_MUTATION);
  const [, executeAssignCart] = useMutation(ASSIGN_CART_MUTATION);
  
  const { login } = useAuth();
  const { cartId, refetchCart } = useCart();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    // 1. Generate Customer Token
    const result = await executeLogin({ email, password });
    
    if (result.error) {
      setErrorMsg('Invalid login or password.');
    } else if (result.data?.generateCustomerToken?.token) {
      const token = result.data.generateCustomerToken.token;
      login(token);

      // 2. Assign the active guest cart to the newly logged-in customer session
      if (cartId) {
        await executeAssignCart({ cartId });
        refetchCart({ requestPolicy: 'network-only' });
      }

      navigate('/customer/account');
    }
  };

  return (
    <div className="auth-container">
      <h1 style={{ marginTop: 0, marginBottom: '2rem' }}>Customer Login</h1>
      {errorMsg && <div style={{ color: 'red', marginBottom: '1rem' }}>{errorMsg}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email <span style={{color: 'red'}}>*</span></label>
          <input type="email" required className="form-input" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Password <span style={{color: 'red'}}>*</span></label>
          <input type="password" required className="form-input" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary" style={{ marginBottom: '1rem' }}>Sign In</button>
      </form>
      
      <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
        <p>New Customers</p>
        <Link to="/customer/account/create" className="btn-primary" style={{ backgroundColor: '#e5e7eb', color: '#000' }}>
          Create an Account
        </Link>
      </div>
    </div>
  );
}