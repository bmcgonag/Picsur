import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe-decorator';
import { InfoService } from '../../services/api/info.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent implements OnInit {
  constructor(private readonly infoService: InfoService) {}

  version = '0.0.0';

  ngOnInit(): void {
    this.subscribeInfo();
  }

  @AutoUnsubscribe()
  subscribeInfo() {
    return this.infoService.live.subscribe((info) => {
      this.version = info.version;
    });
  }
}
