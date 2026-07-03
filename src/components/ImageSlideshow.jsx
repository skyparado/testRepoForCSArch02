import { useEffect, useRef, useState } from 'react';

export default function ImageSlideshow({ images, alt = '' }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      timeoutRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % images.length);
        setVisible(true);
      }, 200);
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutRef.current);
    };
  }, [images.length]);

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden', borderRadius: '8px', margin: '1.5rem 0' }}>
      <img
        src={images[index]}
        alt={alt}
        style={{ width: '100%', display: 'block', opacity: visible ? 1 : 0, transition: 'opacity 0.2s ease-in-out' }}
      />
    </div>
  );
}
