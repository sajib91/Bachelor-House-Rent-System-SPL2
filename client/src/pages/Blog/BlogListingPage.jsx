import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
// import blogService from '../../services/blogService'; // Adjust path
import styles from'./BlogPages.module.css';
import { FaHeart, FaEye, FaCalendarAlt, FaUserEdit } from 'react-icons/fa';

const BlogListingPage = () => {
    const [blogs, setBlogs] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('latest'); // 'latest' or 'trending'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

     const blogsPerPage = 6; // Example: 6 blogs per page

    const fetchBlogs = async (page, sortOrder) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/blogs`, {
                params: { page, limit: blogsPerPage, sortBy: sortOrder }
            });
            setBlogs(response.data.blogs);
            setCurrentPage(response.data.currentPage);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error('Error fetching blogs:', error);
            setError('Failed to load blogs. Please try again later.');
            toast.error('Failed to load blogs.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlogs(currentPage, sortBy);
    }, [currentPage, sortBy]);

    const handlePageChange = (page) => {
        if (page > 0 && page <= totalPages) {
        setCurrentPage(page);
        }
    };

    if (loading) return <div className={styles['blog-listing-container']} style={{ textAlign: 'center' }}>Loading blogs...</div>;
    if (error) return <div className={styles['blog-listing-container']} style={{ textAlign: 'center', color: 'var(--color-error)' }}>{error}</div>;
    if (blogs.length === 0) return <div className={styles['blog-listing-container']} style={{ textAlign: 'center' }}>No blogs found.</div>;

    const handleSortChange = (newSortBy) => {
        setSortBy(newSortBy);
        setCurrentPage(1); // Reset to first page when changing sort
    };

    const handleLike = async (blogId) => {
        try {
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/blogs/${blogId}/like`);
            toast.success('Blog liked!');
            // Re-fetch blogs to update like count, or update state directly
            setBlogs(blogs.map(blog =>
                blog._id === blogId ? { ...blog, likes: blog.likes + 1 } : blog
            ));
        } catch (error) {
            console.error('Error liking blog:', error);
            toast.error('Failed to like blog.');
        }
    };

    return (
        <div className={styles['blog-listing-container']}>
            <h1 className="main-heading">Our Blog</h1>

            <div className={styles['sort-buttons']}>
                <button
                    className={`${styles.button} ${sortBy === 'latest' ? styles.active : ''}`}
                    onClick={() => handleSortChange('latest')}
                >
                    Latest
                </button>
                <button
                    className={`${styles.button} ${sortBy === 'trending' ? styles.active : ''}`}
                    onClick={() => handleSortChange('trending')}
                >
                    Trending
                </button>
            </div>

            {loading ? (
                <p className="subheading">Loading blogs...</p>
            ) : (
                <>
                    <div className={styles['blog-grid']}>
                        {blogs.map((blog) => (
                            <div key={blog._id} className={styles['blog-card']}>
                                {blog.imageUrl && (
                                    <img src={blog.imageUrl} alt={blog.title} className={styles['blog-image']} />
                                )}
                                <div className={styles['blog-card-content']}>
                                    <h2>{blog.title}</h2>
                                    <p className={styles['blog-intro']}>{blog.intro}</p>
                                    <p className={styles['blog-meta']}>
                                        By {blog.name} ({blog.role}) on {new Date(blog.createdAt).toLocaleDateString()}
                                    </p>
                                    <div className={styles['blog-stats']}>
                                        <span><FaHeart /> {blog.likes}</span>
                                        <span><FaEye /> {blog.views}</span>
                                    </div>
                                    <div className={styles['blog-actions']}>
                                        <Link to={`/blogs/${blog._id}`} className={styles['read-more-button']}>Read More</Link>
                                        <button onClick={() => handleLike(blog._id)} className={styles['like-button']}>Like</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className={styles.pagination}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`${styles.pageButton} ${page === currentPage ? styles.active : ''}`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default BlogListingPage;