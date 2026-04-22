// frontend/src/components/properties/SortFilterBar.jsx
import React from 'react';
import styles from './SortFilterBar.module.css'; // Create this CSS module

const SortFilterBar = ({ sortBy, sortOrder, onSortChange }) => {
    const handleSortByChange = (e) => {
        const newSortBy = e.target.value;
        let newSortOrder = sortOrder; // Keep current order unless it's a specific "Low to High" / "High to Low"

        if (newSortBy === 'costLowToHigh') {
            newSortOrder = 'asc';
        } else if (newSortBy === 'costHighToLow') {
            newSortOrder = 'desc';
        } else if (newSortBy === 'dateUploaded' || newSortBy === 'popularity') {
            newSortOrder = 'desc'; // Default for these is descending
        }

        onSortChange(newSortBy, newSortOrder);
    };

    return (
        <div className={styles.sortFilterBar}>
            <div className={styles.sortGroup}>
                <label htmlFor="sort-by">Sort By:</label>
                <select id="sort-by" value={sortBy} onChange={handleSortByChange} className={styles.sortSelect}>
                    <option value="dateUploaded">Date Uploaded (Newest)</option>
                    <option value="costLowToHigh">Cost (Low to High)</option>
                    <option value="costHighToLow">Cost (High to Low)</option>
                    <option value="popularity">Popularity (Most Viewed)</option>
                </select>
            </div>
            {/* You can add filter options here later (e.g., search, space type, etc.) */}
            {/* <div className={styles.filterGroup}>
                <button className={styles.filterButton}>Filters</button>
            </div> */}
        </div>
    );
};

export default SortFilterBar;