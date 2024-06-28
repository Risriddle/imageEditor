import React, { useState } from 'react';
import axios from 'axios';

const Pdf = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event, index) => {
    const newImages = [...images];
    newImages[index] = event.target.files[0];
    setImages(newImages);
  };

  const handleAddImage = () => {
    setImages([...images, null]);
  };

  const handleRemoveImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (images.length === 0) {
      alert("Please select files to upload.");
      return;
    }

    const formData = new FormData();
    images.forEach((image, index) => {
      if (image) {
        formData.append('images', image);
      }
    });

    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/toPdf', formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Create a link element and download the PDF
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'images.pdf');
      document.body.appendChild(link);
      link.click();

      // Clean up the link element
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Error uploading images and creating PDF:", error);
      alert("There was an error processing your request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Upload Images to Convert to PDF</h1>
      <form onSubmit={handleSubmit}>
        {images.map((image, index) => (
          <div key={index}>
            <input type="file" onChange={(event) => handleFileChange(event, index)} />
            <button type="button" onClick={() => handleRemoveImage(index)}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={handleAddImage}>Add Image</button>
        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Upload and Convert"}
        </button>
      </form>
    </div>
  );
};

export default Pdf;
