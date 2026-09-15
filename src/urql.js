import { Client, cacheExchange, fetchExchange, mapExchange } from 'urql';

const client = new Client({
  url: '/graphql',
  fetchOptions: () => {
    const token = localStorage.getItem('customerToken');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  },
  exchanges: [
    cacheExchange,
    mapExchange({
      onError(error) {
        const isAuthError = error.graphQLErrors?.some(
          err => err.message.includes('Consumer key has expired') || 
                 err.message.includes('The current customer isn\'t authorized')
        );

        if (isAuthError) {
          localStorage.removeItem('customerToken');
          // Redirect to login page if on an authenticated route
          if (window.location.pathname.startsWith('/customer/account')) {
            window.location.href = '/customer/account/login';
          }
        }
      },
    }),
    fetchExchange,
  ],
});

export default client;