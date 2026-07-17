import React, { useMemo } from 'react';
import { Cloudinary } from '@cloudinary/url-gen';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
import { AdvancedImage } from '@cloudinary/react';
import { resolveImg } from './config';

const envCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';

// Cloudinary URLs are https://res.cloudinary.com/<cloud_name>/image/upload/...
// Reading the cloud name back out of the URL means images still render correctly
// even if VITE_CLOUDINARY_CLOUD_NAME is missing/stale on the frontend deploy.
function extractCloudName(trimmedUrl) {
  try {
    const url = new URL(trimmedUrl);
    if (url.hostname === 'res.cloudinary.com') {
      return url.pathname.replace(/^\/+/, '').split('/')[0] || null;
    }
    return null;
  } catch {
    return null;
  }
}

function normalizePublicId(value) {
  if (!value || typeof value !== 'string') return { publicId: null, cloudName: null };

  const trimmed = value.trim();
  if (!trimmed) return { publicId: null, cloudName: null };

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
        return { publicId: publicPath.replace(/\.[^/.]+$/, ''), cloudName: extractCloudName(trimmed) };
      }
      return { publicId: null, cloudName: null };
    } catch {
      return { publicId: null, cloudName: null };
    }
  }

  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/images/') || trimmed.startsWith('/') || trimmed.startsWith('data:')) {
    return { publicId: null, cloudName: null };
  }

  if (trimmed.startsWith('blob:')) {
    return { publicId: null, cloudName: null };
  }

  return { publicId: trimmed, cloudName: null };
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
    const { publicId: resolvedPublicId } = normalizePublicId(rawValue);
    return resolvedPublicId ? '' : resolveImg(rawValue, '');
  }, [publicId, src]);

  const image = useMemo(() => {
    const { publicId: resolvedPublicId, cloudName } = normalizePublicId(publicId || src);
    if (!resolvedPublicId) return null;

    const cld = new Cloudinary({ cloud: { cloudName: cloudName || envCloudName || 'demo' } });
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
