import React from "react";
import { Upload } from "lucide-react";

type FileUploadControlProps = {
  id: string;
  label: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  children?: React.ReactNode;
};

export function FileUploadControl({ id, label, onChange, children }: FileUploadControlProps) {
  const labelId = `${id}-label`;

  return (
    <div className="candidate-upload">
      <span className="upload-field-label" id={labelId}>
        {label}
      </span>
      <div className="upload-surface">
        <input
          id={id}
          className="visually-hidden"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          aria-labelledby={labelId}
          onChange={onChange}
        />
        <label htmlFor={id} className="secondary upload-trigger">
          <Upload size={18} aria-hidden="true" />
          Choose files
        </label>
        <p className="upload-constraint">PDF or DOCX · up to 3 resumes</p>
        {children}
      </div>
    </div>
  );
}
