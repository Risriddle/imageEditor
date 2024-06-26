import React, { useState } from 'react';
import UploadImage from './UploadImage'; // Replace with your actual UploadImage component

const Options = () => {
  const [showCropOptions, setShowCropOptions] = useState(false);
  const [selectedSize, setSelectedSize] = useState('passport'); // Default size

  const handleCropClick = () => {
    setShowCropOptions(true);
  };

  const handleSizeChange = (event) => {
    setSelectedSize(event.target.value);
  };

  return (
    <div>
      {!showCropOptions ? (
        <button onClick={handleCropClick}>CROP</button>
      ) : (
        <>
          <div>
            <label>Select Crop Size:</label>
            <select onChange={handleSizeChange} value={selectedSize}>
              <option value="passport">Passport Size</option>
              <option value="whatsapp">WhatsApp Profile Size</option>
              <option value="instagram">Instagram DP Size</option>
            </select>
          </div>
          <UploadImage cropSize={selectedSize} />
          
        </>
      )}
    </div>
  );
};

export default Options;
