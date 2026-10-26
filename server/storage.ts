// Storage provider implementation lives behind the adapter boundary.
export { type Bucket, removeImages, signedUrl, uploadImage } from "@/adapters/storage/supabase";
