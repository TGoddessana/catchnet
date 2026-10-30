import { DatePipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from "@angular/core";
import { ReleaseDetailService } from "./release-detail-state";
import { PaginationButtons } from "src/app/list-elements/pagination-buttons/pagination-buttons";
import { stringAttribute } from "src/app/shared/shared.utils";
import { LoadingOverlayComponent } from "src/app/shared/loading-overlay/loading-overlay.component";

@Component({
  templateUrl: "./release-detail.html",
  styleUrls: ["./release-detail.scss"],
  imports: [DatePipe, RouterLink, PaginationButtons, LoadingOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ReleaseDetailService],
})
export class ReleaseDetail {
  protected service = inject(ReleaseDetailService);

  orgSlug = input.required<string>({ alias: "org-slug" });
  version = input.required<string>();
  cursor = input(undefined, { transform: stringAttribute });

  release = this.service.release;
  paginator = this.service.paginator;
  releaseFiles = this.service.releaseFiles;
  fileListErrors = this.service.releaseFileErrors;
  loading = this.service.loading;
  initialLoadComplete = this.service.initialLoadComplete;

  constructor() {
    effect(() =>
      this.service.params.set({
        orgSlug: this.orgSlug(),
        version: this.version(),
      }),
    );
    effect(() =>
      this.service.queryParams.set({
        cursor: this.cursor(),
      }),
    );
  }
}
