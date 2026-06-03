import { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  FirestoreError,
  Timestamp
} from 'firebase/firestore';

export interface Comment {
  uid: string;
  userName: string;
  text: string;
  ts: number;
}

export interface Post {
  id: string;
  uid: string;
  userName: string;
  userInitials: string;
  photoURL?: string | null;
  text: string;
  type: 'general' | 'donation' | 'volunteer' | 'challenge';
  likes: string[];
  comments: Comment[];
  imageUrl?: string | null;
  createdAt: Timestamp | null;
  userRole?: string;
  isVerified?: boolean;
  taggedNGO?: { uid: string; name: string } | null;
}

export const useFeed = (filter: string = 'all') => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    console.log("useFeed: Starting fetch for filter:", filter);
    setLoading(true);
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('timestamp', 'desc'), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("useFeed: Received snapshot, docs count:", snapshot.size);
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as Post[];

      let filteredPosts = fetchedPosts;
      if (filter !== 'all') {
        filteredPosts = fetchedPosts.filter(p => p.type === filter);
      }

      setPosts(filteredPosts);
      setLoading(false);
    }, (err) => {
      console.error("useFeed: Firestore error:", err);
      setError(err);
      setLoading(false);
    });

    return () => {
      console.log("useFeed: Unsubscribing");
      unsubscribe();
    };
  }, [filter]);

  return { posts, loading, error };
};
