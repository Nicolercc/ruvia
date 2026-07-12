import React from "react";
import { Upload } from "lucide-react";

type FileUploadControlProps = {
  id: string;
  label: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function FileUploadControl({ id, label, onChange }: FileUploadControlProps) {
  return (
    <div className="file-upload-control">
      <input
        id={id}
        className="visually-hidden"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple
        onChange={onChange}
      />
      <label htmlFor={id} className="secondary file-upload-button">
        <Upload size={18} aria-hidden="true" />
        {label}
      </label>
    </div>
  );
}
