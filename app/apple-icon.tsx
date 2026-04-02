import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "linear-gradient(145deg, rgba(255,255,255,0.55) 0%, rgba(200,220,255,0.25) 50%, rgba(160,200,255,0.15) 100%)",
          border: "2px solid rgba(255,255,255,0.6)",
          boxShadow: "inset 0 4px 0 rgba(255,255,255,0.8), 0 8px 32px rgba(100,150,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 110,
        }}
      >
        🧸
      </div>
    ),
    size
  );
}
