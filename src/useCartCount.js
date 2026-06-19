import { useState, useEffect } from 'react';

const getCount = () => {
  try {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    return cart.reduce((s, i) => s + (i.qty || 0), 0);
  } catch { return 0; }
};

export default function useCartCount() {
  const [count, setCount] = useState(getCount);

  useEffect(() => {
    const update = () => setCount(getCount());
    window.addEventListener('storage', update);
    window.addEventListener('cart-updated', update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('cart-updated', update);
    };
  }, []);

  return count;
}
