// Legacy external HTTPS images are supported while stores migrate to private Storage.
// New image paths are never exposed directly: the route checks product RLS first.
export function productImageSrc(productId:string,path:string|undefined,index=0) {
 if(!path)return '';
 if(/^https:\/\/[^\s]+$/i.test(path))return path;
 if(!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path))
   return '';
 if(!/^[0-9a-f-]{36}$/i.test(productId) || index<0 || index>7 || !Number.isInteger(index))
   return '';
 return '/api/catalog-image/'+encodeURIComponent(productId)+'?index='+index;
}
