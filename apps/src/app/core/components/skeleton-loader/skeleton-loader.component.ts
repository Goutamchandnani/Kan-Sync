import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-loader',
  templateUrl: './skeleton-loader.component.html',
  styleUrls: ['./skeleton-loader.component.css']
})
export class SkeletonLoaderComponent {
  @Input() width: string = '100%';
  @Input() height: string = '100%';
  @Input() count: number = 1;

  counter(i: number) {
    return new Array(i);
  }
}