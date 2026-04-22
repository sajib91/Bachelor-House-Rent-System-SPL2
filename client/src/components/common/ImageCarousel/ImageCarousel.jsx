// frontend/src/components/common/ImageCarousel.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './ImageCarousel.module.css';

const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const thumbnailStripRef = useRef(null); // Ref for the thumbnail strip to scroll it

  useEffect(() => {
    if (!images || images.length === 0) {
      setCurrentIndex(0);
      return;
    }
    // Ensure current index is valid if images array shrinks or if it's the first render
    if (currentIndex >= images.length) {
      setCurrentIndex(0);
    }

    // Scroll the active thumbnail into view
    if (thumbnailStripRef.current) {
      const activeThumbnail = thumbnailStripRef.current.children[currentIndex];
      if (activeThumbnail) {
        activeThumbnail.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center' // Keep the active thumbnail centered horizontally
        });
      }
    }
  }, [images, currentIndex]); // Depend on images and currentIndex

  if (!images || images.length === 0) {
    return <div className={styles.noImages}>No Images Available</div>;
  }

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToImage = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div className={styles.carouselContainer}>
      <div className={styles.mainImageContainer}> {/* Changed from mainImageWrapper to mainImageContainer as per your latest CSS */}
        {images.length > 1 && ( // Only show arrows if more than one image
          <>
            <button className={`${styles.arrow} ${styles.leftArrow}`} onClick={goToPrevious}>
              &#10094; {/* Left arrow character */}
            </button>
            <button className={`${styles.arrow} ${styles.rightArrow}`} onClick={goToNext}>
              &#10095; {/* Right arrow character */}
            </button>
          </>
        )}
        <img
          src={images[currentIndex]}
          alt={`Property image ${currentIndex + 1}`}
          className={styles.mainImage}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/fallback-image.jpg'; // Fallback for individual images
          }}
        />
      </div>

      {images.length > 1 && ( // Only show thumbnails if more than one image
        <div className={styles.thumbnailContainer} ref={thumbnailStripRef}> {/* Changed from thumbnailStrip to thumbnailContainer as per your latest CSS */}
          {images.map((imgUrl, index) => (
            <img
              key={index}
              src={imgUrl}
              alt={`Thumbnail ${index + 1}`}
              className={`${styles.thumbnail} ${index === currentIndex ? styles.active : ''}`}
              onClick={() => goToImage(index)}
              onError={(e) => { e.target.onerror = null; e.target.src = '/fallback-thumbnail.jpg'; }} // Specific fallback for thumbnails
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;