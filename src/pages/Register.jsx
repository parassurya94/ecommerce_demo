import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, gql } from 'urql';
import { useAuth } from '../context/AuthContext';

const REGISTER_MUTATION = gql`
  mutation CreateCustomer($firstname: String!, $lastname: String!, $email: String!, $password: String!) {
    createCustomer(input: {
      firstname: $firstname,
      lastname: $lastname,
      email: $email,
      password: $password
    }) {
      customer { email }
    }
  }
`;

const LOGIN_MUTATION = gql`
  mutation GenerateCustomerToken($email: String!, $password: String!) {
    generateCustomerToken(email: $email, password: $password) { token }
  }
`;

export default function Register() {
  const [formData, setFormData] = useState({ firstname: '', lastname: '', email: '', password: '' });
  const [errorMsg, setErrorMsg] = useState('');
  
  const [{}, executeRegister] = useMutation(REGISTER_MUTATION);
  const [{}, executeLogin] = useMutation(LOGIN_MUTATION);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    // 1. Create Customer
    const regResult = await executeRegister(formData);
    
    if (regResult.error) {
      setErrorMsg(regResult.error.message.replace('[GraphQL] ', ''));
      return;
    }

    // 2. Auto-login on success
    const loginResult = await executeLogin({ email: formData.email, password: formData.password });
    if (loginResult.data?.generateCustomerToken?.token) {
      login(loginResult.data.generateCustomerToken.token);
      navigate('/customer/account');
    }
  };

  return (
    <div className="auth-container">
      <h1 style={{ marginTop: 0, marginBottom: '2rem' }}>Create New Customer Account</h1>
      {errorMsg && <div style={{ color: 'red', marginBottom: '1rem', padding: '10px', background: '#fee2e2', borderRadius: '4px' }}>{errorMsg}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>First Name <span style={{color: 'red'}}>*</span></label>
          <input type="text" name="firstname" required className="form-input" onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Last Name <span style={{color: 'red'}}>*</span></label>
          <input type="text" name="lastname" required className="form-input" onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Email <span style={{color: 'red'}}>*</span></label>
          <input type="email" name="email" required className="form-input" onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Password <span style={{color: 'red'}}>*</span></label>
          <input type="password" name="password" required className="form-input" onChange={handleChange} />
        </div>
        <button type="submit" className="btn-primary">Create an Account</button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <Link to="/customer/account/login">Already have an account? Sign In</Link>
      </div>
    </div>
  );
}