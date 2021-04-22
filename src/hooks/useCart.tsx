import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartCopy = [...cart];

      const { data: stock }: { data: Stock } = await api.get(`/stock/${productId}`);

      const cartChosenProduct = cart.find((product) => product.id === productId);

      if ((cartChosenProduct && stock.amount <= cartChosenProduct.amount)
        || stock.amount < 1
      ) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }


      if (cartCopy.length !== 0) {
        const productToAddIndex = cartCopy.findIndex((product) => product.id === productId);
        if (productToAddIndex !== -1) {
          cartCopy[productToAddIndex].amount += 1;
        } else {
        const { data: product }: { data: Product } = await api.get(`/products/${productId}`);
          cartCopy.push({...product, amount: 1});
        }
      } else {
        const { data: product }: { data: Product } = await api.get(`/products/${productId}`);
        cartCopy.push({...product, amount: 1});
      }
      
      setCart(cartCopy);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartCopy));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartCopy = [...cart];

      const productIndex = cartCopy.findIndex((product) => product.id === productId);

      if (productIndex === -1) {
        toast.error('Erro na remoção do produto');
        return;
      }

      cartCopy.splice(productIndex, 1);

      setCart(cartCopy);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartCopy));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const { data: stock }: { data: Stock } = await api.get(`/stock/${productId}`);

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return; 
      }

      const cartCopy = [...cart];
      const product = cartCopy.find((product) => product.id === productId);

      if (!product) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }      

      product.amount = amount;

      setCart(cartCopy);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartCopy));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
