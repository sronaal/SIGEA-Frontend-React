import { AlertCircle } from "lucide-react";

/** Full-page error state that renders the message of the backend `ApiError` contract. */
export function LoadError({ message }: { message: string }) {
  return (
    <div className="empty-state" role="alert">
      <div className="empty-icon">
        <AlertCircle />
      </div>
      <h3>No pudimos cargar la información</h3>
      <p>{message}</p>
    </div>
  );
}
