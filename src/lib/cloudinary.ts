/**
 * Utility to upload images to Cloudinary via Unsigned Upload
 * Note: Values are currently set directly to bypass environment loading issues.
 */
export async function uploadToCloudinary(file: File | Blob): Promise<string | null> {
  // Using direct values as backup for env variables
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "ddozkcgfm";
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "areta_preset";

  if (!cloudName || !uploadPreset || cloudName === "your_cloud_name") {
    console.error("Cloudinary configuration missing.");
    return null;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary upload failed:", errorData);
      return null;
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return null;
  }
}
