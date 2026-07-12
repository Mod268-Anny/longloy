export function buildProductPayload(formData = {}) {
  const payload = {};

  if (formData.name !== undefined && formData.name !== '') {
    payload.name = formData.name.trim();
  }

  if (formData.price !== undefined && formData.price !== '') {
    payload.price = Number(formData.price);
  }

  if (formData.description !== undefined && formData.description !== '') {
    payload.description = formData.description.trim();
  }

  if (formData.image_url !== undefined && formData.image_url !== '') {
    payload.image_url = formData.image_url.trim();
  }

  if (formData.is_available !== undefined) {
    payload.is_available = formData.is_available ? 1 : 0;
  }

  return payload;
}

export function buildShopPayload(formData = {}) {
  const payload = {};

  if (formData.shop_name !== undefined && formData.shop_name !== '') {
    payload.shop_name = formData.shop_name.trim();
  }

  if (formData.description !== undefined && formData.description !== '') {
    payload.description = formData.description.trim();
  }

  if (formData.phone_number !== undefined && formData.phone_number !== '') {
    payload.phone_number = formData.phone_number.trim();
  }

  if (formData.location !== undefined && formData.location !== '') {
    payload.location = formData.location.trim();
  }

  if (formData.market_id !== undefined && formData.market_id !== '') {
    payload.market_id = Number(formData.market_id);
  }

  if (formData.status !== undefined && formData.status !== '') {
    payload.status = formData.status;
  }

  if (formData.image_url !== undefined && formData.image_url !== '') {
    payload.image_url = formData.image_url.trim();
  }

  return payload;
}

export default {
  buildProductPayload,
  buildShopPayload,
};
