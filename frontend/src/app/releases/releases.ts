import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { DatePipe } from "@angular/common";
import { ReleasesService } from "./releases-state";
import { PaginationButtons } from "../list-elements/pagination-buttons/pagination-buttons";
import { LoadingOverlayComponent } from "../shared/loading-overlay/loading-overlay.component";

@Component({
  templateUrl: "./releases.html",
  styleUrls: ["./releases.scss"],
  imports: [DatePipe, RouterLink, PaginationButtons, LoadingOverlayComponent],
  providers: [ReleasesService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Releases {
  protected service = inject(ReleasesService);

  orgSlug = input.required<string>({ alias: "org-slug" });
  cursor = input<string | undefined>();
  paginator = this.service.paginator;
  releases = this.service.releases;
  errors = this.service.errors;
  isLoading = this.service.isLoading;
  initialLoadComplete = this.service.initialLoadComplete;

  constructor() {
    effect(() =>
      this.service.params.set({
        orgSlug: this.orgSlug(),
        cursor: this.cursor(),
      }),
    );
  }
}
