import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const API = import.meta.env.VITE_API_URL || '';
const DataContext = createContext();

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [apartments, setApartments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchApartments() {
    try {
      const response = await fetch(`${API}/api/apartments`);
      if (!response.ok) {
        throw new Error('Unable to load apartments');
      }
      const data = await response.json();
      setApartments(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load apartments');
      setApartments([]);
    }
  }

  async function fetchProfile() {
    try {
      const response = await fetch(`${API}/api/profile`, {
        credentials: 'include',
      });

      if (!response.ok) {
        setReviews([]);
        setComments([]);
        return;
      }

      const data = await response.json();
      setReviews(data.reviews || []);
      setComments(data.comments || []);
    } catch (err) {
      console.error(err);
      setReviews([]);
      setComments([]);
    }
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchApartments(),
        user ? fetchProfile() : Promise.resolve(),
      ]);
      setLoading(false);
    }

    loadData();
  }, [user]);

  function getAptRating(aptId) {
    const apt = apartments.find((a) => a.id === aptId);
    return apt ? Number(apt.rating) || 0 : 0;
  }

  function getAptReviewCount(aptId) {
    const apt = apartments.find((a) => a.id === aptId);
    return apt ? Number(apt.reviews) || 0 : 0;
  }

  return (
    <DataContext.Provider
      value={{
        apartments,
        reviews,
        comments,
        loading,
        error,
        fetchApartments,
        fetchProfile,
        getAptRating,
        getAptReviewCount,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
