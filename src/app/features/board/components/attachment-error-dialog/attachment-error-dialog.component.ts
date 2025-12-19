import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

export interface AttachmentErrorDialogData {
  errorMessage: string;
}

@Component({
  selector: 'app-attachment-error-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  templateUrl: './attachment-error-dialog.component.html',
  styleUrls: ['./attachment-error-dialog.component.scss']
})
export class AttachmentErrorDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AttachmentErrorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AttachmentErrorDialogData
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}
