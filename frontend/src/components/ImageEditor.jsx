import React, { useState } from 'react';
import Crop from './Crop';
import Convert from './Convert';
import Pdf from './Pdf'

const ImageEditor = () => {
  const [showCropOptions, setShowCropOptions] = useState(false);
  const [selectedSize, setSelectedSize] = useState('passport');
  const [showConvertOptions, setShowConvertOptions] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState('jpeg');

  const handleCropClick = () => {
    setShowCropOptions(!showCropOptions);
  };

  const handleSizeChange = (event) => {
    setSelectedSize(event.target.value);
  };

  const handleConvertClick = () => {
    setShowConvertOptions(!showConvertOptions);
  };

  const handleExtensionChange = (event) => {
    setSelectedExtension(event.target.value);
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
          <Crop cropSize={selectedSize} />
        </>
      )}

      <button onClick={handleConvertClick}>CONVERT</button>
      {showConvertOptions && (
        <>
          <div>
            <label>Select Extension:</label>
            <select onChange={handleExtensionChange} value={selectedExtension}>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="gif">GIF</option>
              <option value="bmp">BMP</option>
            </select>
          </div>
          <Convert type={selectedExtension} />
        </>
      )}


      <Pdf/>
    </div>
  );
};

export default ImageEditor;
