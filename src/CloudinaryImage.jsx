import React, { useMemo } from 'react';
import { Cloudinary } from '@cloudinary/url-gen';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
import { AdvancedImage } from '@cloudinary/react';
import { resolveImg } from './config';

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo';
const cld = new Cloudinary({ cloud: { cloudName } });

function normalizePublicId(value) {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const pathname = url.pathname.replace(/^\/+/, '');
      const parts = pathname.split('/');
      const uploadIndex = parts.indexOf('upload');
      if (uploadIndex >= 0) {
        const tail = parts.slice(uploadIndex + 1);
        const withoutVersion = tail[0]?.startsWith('v') ? tail.slice(1) : tail;
        const publicPath = withoutVersion.join('/');
        return publicPath.replace(/\.[^/.]+$/, '');
      }
      return null;
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/images/') || trimmed.startsWith('/') || trimmed.startsWith('data:')) {
    return null;
  }

  if (trimmed.startsWith('blob:')) {
    return null;
  }

  return trimmed;
}

export default function CloudinaryImage({
  src,
  publicId,
  alt = '',
  width = 500,
  height = 500,
  className,
  style,
  ...props
}) {
  const resolvedSrc = useMemo(() => {
    const rawValue = publicId || src;
    if (!rawValue) return '';
    const resolvedPublicId = normalizePublicId(rawValue);
    return resolvedPublicId ? '' : resolveImg(rawValue, '');
  }, [publicId, src]);

  const image = useMemo(() => {
    const resolvedPublicId = normalizePublicId(publicId || src);
    if (!resolvedPublicId) return null;

    const img = cld.image(resolvedPublicId).format('auto').quality('auto');

    if (width && height) {
      img.resize(fill().width(width).height(height).gravity(autoGravity()));
    }

    return img;
  }, [publicId, src, width, height]);

  if (!image) {
    return <img src={resolvedSrc || undefined} alt={alt} className={className} style={style} {...props} />;
  }

  return <AdvancedImage cldImg={image} alt={alt} className={className} style={style} {...props} />;
}
