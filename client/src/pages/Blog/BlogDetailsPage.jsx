// frontend/src/pages/Blog/BlogDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

// import blogService from '../../services/blogService';
import styles from './BlogPages.module.css'; 
import { FaHeart, FaEye, FaCalendarAlt, FaUserEdit } from 'react-icons/fa';

const BlogDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBlog = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/blogs/${id}`);
                setBlog(response.data);
            } catch (err) {
                console.error('Error fetching blog details:', err);
                setError('Blog not found or an error occurred.');
                toast.error('Failed to load blog details.');
            } finally {
                setLoading(false);
            }
        };
        fetchBlog();
    }, [id]);

    if (loading) {
        return <div className="blog-details-loading">Loading blog...</div>;
    }

    if (error) {
        return <div className="blog-details-error">{error}</div>;
    }

    if (!blog) {
        return <div className="blog-details-not-found">Blog not found.</div>;
    }

    return (
        <div className={styles['blog-details-container']}>
            {blog.imageUrl && (
                <img src={blog.imageUrl} alt={blog.title} className={styles['blog-details-image']} />
            )}
            <h1 className="main-heading">{blog.title}</h1>
            <p className={styles['blog-details-meta']}>
                By {blog.name} ({blog.role}) on {new Date(blog.createdAt).toLocaleDateString()}
                <span className={styles['blog-details-stats']}>
                    {' '}<FaHeart /> {blog.likes} <FaEye /> {blog.views}
                </span>
            </p>
            <div className={styles['blog-details-content']} dangerouslySetInnerHTML={{ __html: blog.content }}></div>
            <button onClick={() => navigate('/blogs')} className={styles['back-to-blogs-button']}>Back</button>
        </div>
    );
};

export default BlogDetailsPage;