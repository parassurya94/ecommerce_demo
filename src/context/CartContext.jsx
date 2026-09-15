import React, { createContext, useState, useContext, useEffect } from 'react';
import { useMutation, useQuery, gql } from 'urql';
import { useAuth } from './AuthContext';

const CartContext = createContext();

const CREATE_CART = gql`
  mutation CreateEmptyCart {
    createEmptyCart
  }
`;

const GET_GUEST_CART = gql`
  query GetGuestCart($cartId: String!) {
    cart(cart_id: $cartId) {
      id
      total_quantity
      applied_coupons {
        code
      }
      prices {
        subtotal_excluding_tax { value currency }
        discounts {
          label
          amount {
            value
            currency
          }
        }
        grand_total { value currency }
      }
      items {
        uid
        quantity
        product {
          name
          sku
          url_key
          image { url }
        }
        prices {
          price { value currency }
          row_total { value currency }
        }
      }
    }
  }
`;

const GET_CUSTOMER_CART = gql`
  query GetCustomerCart {
    customerCart {
      id
      total_quantity
      applied_coupons {
        code
      }
      prices {
        subtotal_excluding_tax { value currency }
        discounts {
          label
          amount {
            value
            currency
          }
        }
        grand_total { value currency }
      }
      items {
        uid
        quantity
        product {
          name
          sku
          url_key
          image { url }
        }
        prices {
          price { value currency }
          row_total { value currency }
        }
      }
    }
  }
`;

// Unified Magento 2 Add To Cart
const ADD_TO_CART = gql`
  mutation AddToCart($cartId: String!, $sku: String!, $quantity: Float!) {
    addProductsToCart(
      cartId: $cartId,
      cartItems: [{ sku: $sku, quantity: $quantity }]
    ) {
      cart {
        total_quantity
      }
      user_errors { message }
    }
  }
`;

// Unified Magento 2 Update Cart
const UPDATE_CART_ITEM = gql`
  mutation UpdateCart($cartId: String!, $uid: ID!, $quantity: Float!) {
    updateCartItems(
      input: {
        cart_id: $cartId,
        cart_items: [{ cart_item_uid: $uid, quantity: $quantity }]
      }
    ) {
      cart {
        total_quantity
      }
    }
  }
`;

// Unified Magento 2 Remove Cart Item
const REMOVE_CART_ITEM = gql`
  mutation RemoveCartItem($cartId: String!, $uid: ID!) {
    removeItemFromCart(
      input: {
        cart_id: $cartId,
        cart_item_uid: $uid
      }
    ) {
      cart {
        total_quantity
      }
    }
  }
`;

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cartId, setCartId] = useState(localStorage.getItem('magento_cart_id') || null);
  const [cartData, setCartData] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  const [, createEmptyCart] = useMutation(CREATE_CART);
  const [, addToCartMutation] = useMutation(ADD_TO_CART);
  const [, updateCartMutation] = useMutation(UPDATE_CART_ITEM);
  const [, removeCartMutation] = useMutation(REMOVE_CART_ITEM);

  // CRITICAL: Pause query strictly if isAuthenticated is false and cartId is missing/null/empty
  const [{ data: guestCartData, fetching: guestFetching }, refetchGuestCart] = useQuery({
    query: GET_GUEST_CART,
    variables: { cartId: cartId || '' },
    pause: isAuthenticated || !cartId
  });

  const [{ data: customerCartData, fetching: customerFetching }, refetchCustomerCart] = useQuery({
    query: GET_CUSTOMER_CART,
    pause: !isAuthenticated
  });

  const fetching = isAuthenticated ? customerFetching : (cartId ? guestFetching : false);
  const activeCartData = isAuthenticated ? customerCartData?.customerCart : guestCartData?.cart;

  useEffect(() => {
    if (activeCartData) {
      setCartData(activeCartData);
      setCartCount(activeCartData.total_quantity || 0);
      if (isAuthenticated && cartId) {
        localStorage.removeItem('magento_cart_id');
        setCartId(null);
      }
    } else if (!fetching && !activeCartData) {
      setCartData(null);
      setCartCount(0);
    }
  }, [activeCartData, isAuthenticated, fetching, cartId]);

  const refetchCart = (opts) => {
    if (isAuthenticated) {
      refetchCustomerCart(opts);
    } else if (cartId) {
      refetchGuestCart(opts);
    }
  };

  const getOrCreateCartId = async () => {
    if (isAuthenticated) return null;
    if (cartId) return cartId;

    const result = await createEmptyCart();
    const newId = result.data?.createEmptyCart;
    if (newId) {
      localStorage.setItem('magento_cart_id', newId);
      setCartId(newId);
      return newId;
    }
    return null;
  };

  const addToCart = async (sku, quantity = 1) => {
    if (isAuthenticated) {
      const cId = cartData?.id || cartId || localStorage.getItem('magento_cart_id'); 
      if (!cId) return;

      const result = await addToCartMutation({ cartId: cId, sku, quantity });
      if (!result.error) {
        refetchCart({ requestPolicy: 'network-only' });
      }
      return result;
    } else {
      const cId = await getOrCreateCartId();
      if (!cId) return;

      const result = await addToCartMutation({ cartId: cId, sku, quantity });
      if (!result.error) {
        refetchCart({ requestPolicy: 'network-only' });
      }
      return result;
    }
  };

  const updateQuantity = async (uid, quantity) => {
    const activeCartId = cartId || cartData?.id || localStorage.getItem('magento_cart_id');
    if (!activeCartId) return;

    const result = await updateCartMutation({ cartId: activeCartId, uid, quantity });
    if (!result.error) {
      refetchCart({ requestPolicy: 'network-only' });
    }
  };

  const removeItem = async (uid) => {
    const activeCartId = cartId || cartData?.id || localStorage.getItem('magento_cart_id');
    if (!activeCartId) return;

    const result = await removeCartMutation({ cartId: activeCartId, uid });
    if (!result.error) {
      refetchCart({ requestPolicy: 'network-only' });
    }
  };

  return (
    <CartContext.Provider value={{ cartId, cartData, cartCount, fetching, addToCart, updateQuantity, removeItem, refetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);