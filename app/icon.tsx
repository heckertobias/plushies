import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "linear-gradient(145deg, rgba(255,255,255,0.55) 0%, rgba(200,220,255,0.25) 50%, rgba(160,200,255,0.15) 100%)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 8px rgba(100,150,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          backdropFilter: "blur(4px)",
        }}
      >
        🧸
      </div>
    ),
    size
  );
}
