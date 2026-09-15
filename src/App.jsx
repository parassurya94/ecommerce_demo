import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'urql';
import client from './urql';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import DefaultLayout from './components/Layout/DefaultLayout';
import Home from './pages/Home';
import Category from './pages/Category';
import Product from './pages/Product';
import Search from './pages/Search';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import OrderView from './pages/OrderView';
import Cart from './pages/Cart'; // Import Cart page

export default function App() {
  return (
    <Provider value={client}>
      <AuthProvider>
        <CartProvider>
          <Router>
            <DefaultLayout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/c/:urlPath*" element={<Category />} />
                <Route path="/p/:urlKey" element={<Product />} /> 
                <Route path="/cart" element={<Cart />} /> {/* Cart Route */}
                <Route path="/customer/account/login" element={<Login />} />
                <Route path="/customer/account/create" element={<Register />} />
                <Route path="/customer/account" element={<Account />} />
                <Route path="/customer/order/:orderNumber" element={<OrderView />} />
              </Routes>
            </DefaultLayout>
          </Router>
        </CartProvider>
      </AuthProvider>
    </Provider>
  );
}