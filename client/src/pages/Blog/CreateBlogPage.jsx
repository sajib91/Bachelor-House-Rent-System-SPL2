//frontend/src/pages/CreateBlogPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill's CSS

// import blogService from '../../services/blogService';
import styles from './BlogPages.module.css'; // Blog specific styles

const CreateBlogPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        role: 'Content Creator', 
        title: '',
        category: 'News & Events', 
        intro: '',
        imageUrl: '', 
        content: '' 
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleContentChange = (value) => {
        setFormData({ ...formData, content: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Get JWT from localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('You must be logged in to create a blog.');
                navigate('/login');
                return;
            }

            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };

            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/blogs`, formData, config);
            toast.success('Blog created successfully!');
            navigate('/blogs'); // Redirect to blog listing page
        } catch (error) {
            console.error('Error creating blog:', error);
            console.log('Error response from backend:', error.response); 
            console.log('Error response data:', error.response?.data); 
            console.log('Error response data message:', error.response?.data?.message);
            if (error.response && error.response.data && error.response.data.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to create blog. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Quill modules for the rich text editor
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet', 'indent',
        'link', 'image'
    ];

    return (
        <div className={styles['create-blog-container']}>
            <h1 className="main-heading">Create Blog</h1>
            <form onSubmit={handleSubmit} className={styles['create-blog-form']}>
                <div className={styles['form-group']}>
                    <label htmlFor="name">Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        placeholder="Enter your name!"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className={styles.inputField}
                    />
                </div>
                <div className={styles['form-group']}>
                    <label htmlFor="role">Role</label>
                    <input
                        type="text"
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        readOnly // Role is likely fixed for content creators
                        className={styles.inputField} 
                    />
                </div>
                <div className={styles['form-group']}>
                    <label htmlFor="title">Title</label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        placeholder="Title goes here!"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        className={styles.inputField} 
                    />
                </div>
                <div className={styles['form-group']}>
                    <label htmlFor="category">Category</label>
                    <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        className={styles.selectField} 
                    >
                        <option value="News & Events">News & Events</option>
                        <option value="Tips">Tips</option>
                        <option value="Guides">Guides</option>
                        <option value="Market Updates">Market Updates</option>
                        <option value="Giveaways & Offers">Giveaways & Offers</option>
                        {/* Add more categories as needed */}
                    </select>
                </div>
                <div className={styles['form-group']}>
                    <label htmlFor="intro">Intro</label>
                    <textarea
                        id="intro"
                        name="intro"
                        placeholder="Brief Introduction!"
                        value={formData.intro}
                        onChange={handleChange}
                        required
                        className={styles.inputField}
                    ></textarea>
                </div>
                <div className={styles['form-group']}>
                    <label htmlFor="imageUrl">Image URL</label>
                    <input
                        type="text"
                        id="imageUrl"
                        name="imageUrl"
                        placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                        value={formData.imageUrl}
                        onChange={handleChange}
                        className={styles.inputField} 
                    />
                </div>
                <div className={styles['form-group']}>
                    <label htmlFor="content">Content</label>
                    <ReactQuill
                        theme="snow"
                        value={formData.content}
                        onChange={handleContentChange}
                        modules={modules}
                        formats={formats}
                        placeholder="Write your blog content here..."
                        className={styles['quill-editor']} 
                    />
                </div>
                <div className={styles['form-actions']}>
                    <button type="submit" disabled={loading} className={styles.submitButton}>
                        {loading ? 'Submitting...' : 'Submit'}
                    </button>
                    <button type="reset" onClick={() => setFormData({
                        name: '', role: 'Content Creator', title: '', category: 'News & Events',
                        intro: '', imageUrl: '', content: ''
                    })} disabled={loading} className={`${styles.submitButton} ${styles.resetButton}`}>
                        Reset
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateBlogPage;