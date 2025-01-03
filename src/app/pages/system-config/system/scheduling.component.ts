import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormControl } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputMaskModule } from 'primeng/inputmask';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { take, finalize, Subscription } from 'rxjs';
import { LogoSvgComponent } from '../../../_shared/_components/logo/logo.component';
import { SystemConfigManagerApiService } from '../_services/systemConfigManager.api.service';
import { TooltipModule } from 'primeng/tooltip';
import { Dialog, DialogModule } from 'primeng/dialog';
import { TimeOption } from '../../../_features/new-service/_interfaces/time-stamp.interface';
import { NewServiceComponent } from '../../../_features/new-service/new-service.component';

import { LayoutModule } from '@angular/cdk/layout';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CalendarModule } from 'primeng/calendar';
import { SystemConfigManagerSchedulingCreateDto } from '../_dtos/system-config-manager-scheduling-create.dto';
import moment from 'moment';
import { SelectFormComponent } from '../../../_shared/_components/forms/select-form/select-form.component';
import { FormControlPipe } from '../../../_shared/_utils/form-control-pipe';
import { handlerErrorBase } from '../../../_shared/_utils/handler-error-base';

interface Services {
  name: string;
  value: number;
}

@Component({
  selector: 'app-scheduling',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    RouterLink,
    FormsModule,
    LogoSvgComponent,
    ProgressSpinnerModule,
    InputMaskModule,
    ButtonModule,
    SelectFormComponent,
    TooltipModule,
    DialogModule,
    NewServiceComponent,
    LayoutModule,
    InputNumberModule,
    ToastModule,
    CalendarModule,
  ],
  providers: [MessageService],
  templateUrl: './scheduling.component.html',
  styleUrl: './scheduling.component.scss',
})
export class SchedulingComponent implements OnInit, OnDestroy {
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private sub: Subscription = new Subscription();
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private messageService: MessageService = inject(MessageService);

  SystemConfigManagerApiService = inject(SystemConfigManagerApiService);

  hours: TimeOption[] = [];
  minutes: TimeOption[] = [];
  services: Services[] = [{ name: 'Novo Serviço', value: 0 }];

  @ViewChild('dialog') dialog!: Dialog;

  loading = false;
  errorMessage: string | null = null;
  modalServiceVisible: boolean = false;

  protected scheudulingForm = this.formBuilder.group({
    nameCustomer: new FormControl('', { validators: [Validators.required] }),
    totalPrice: new FormControl({ value: 0, disabled: true }, { validators: [Validators.required] }),
    phone: new FormControl('', { validators: [Validators.required] }),
    date: new FormControl(new Date(Date.now())),
    email: new FormControl('', { validators: [Validators.email] }),
    duration: new FormControl('', { validators: [Validators.required] }),
    service: new FormControl<{ name: string; value: number } | null>(null, { validators: [Validators.required] }),
  });

  protected serviceForm = this.formBuilder.group({
    id: new FormControl<number | null>(null),
    name: new FormControl('', { validators: [Validators.required] }),
    hours: new FormControl<TimeOption | null>({ name: '00 Horas', value: 0 }, { validators: [Validators.required] }),
    minutes: new FormControl<TimeOption | null>(
      { name: '00 Minutos', value: 0 },
      { validators: [Validators.required] }
    ),
    price: new FormControl(0, { validators: [Validators.min(1)] }),
  });

  ngOnInit() {
    this.onChangeSelectService();
    this.fetchService();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
  onSubmit() {
    this.scheudulingForm.markAllAsTouched();

    console.log(this.scheudulingForm);

    if (this.scheudulingForm.valid) {
      this.loading = true;

      let systemConfigManagerScheduleCreateDto: SystemConfigManagerSchedulingCreateDto = {
        scheduling: {
          date: this.scheudulingForm.controls.date.value?.toISOString() ?? '',
          duration: this.scheudulingForm.controls.duration.value ?? '',
          schedulingServices: {
            discount: 0,
            name: this.scheudulingForm.controls.service.value?.name ?? '',
            price: this.scheudulingForm.controls.service.value?.value ?? 0,
          },
        },
        customer: {
          email: this.scheudulingForm.controls.email.value ?? '',
          name: this.scheudulingForm.controls.nameCustomer.value ?? '',
          phone: this.scheudulingForm.controls.phone.value ?? '',
        },
      };

      this.sub.add(
        this.SystemConfigManagerApiService.createScheduling(systemConfigManagerScheduleCreateDto)
          .pipe(
            take(1),
            finalize(() => {
              this.loading = false;
            })
          )
          .subscribe({
            next: (response) => {
              this.router.navigate(['scheduling']);
            },
            error: (error) => {
              this.errorMessage = handlerErrorBase(error)?.message ?? 'Ocorreu um erro, tente novamente mais tarde.';
            },
          })
      );
    }
  }

  showDialog() {
    this.modalServiceVisible = true;
    this.dialogFullScreen();
  }

  handlerSuccessCreatedService() {
    this.fetchService();
    this.modalServiceVisible = false;
    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso!',
      detail: 'O Serviço foi criado!',
    });
  }

  private dialogFullScreen() {
    this.dialog.maximize();
  }

  private onChangeSelectService() {
    this.sub.add(
      this.scheudulingForm.controls.service.valueChanges.subscribe((valueChanges) => {
        console.log(valueChanges);

        if (valueChanges?.value === 0) {
          this.showDialog();

          setTimeout(() => {
            this.scheudulingForm.controls.service.setValue(null);
          }, 100);

          this.cdr.detectChanges();
        }
      })
    );
  }

  private fetchService() {
    this.loading = true;

    this.scheudulingForm.disable();
    this.SystemConfigManagerApiService.obtainService()
      .pipe(
        finalize(() => {
          this.scheudulingForm.enable();
          this.scheudulingForm.controls.totalPrice.disable();
          this.loading = false;
        })
      )
      .subscribe({
        next: (response) => {
          const service: { name: string; value: number } = {
            name: response.services.name,
            value: response.services.id,
          };

          this.scheudulingForm.controls.service.patchValue(service);

          this.scheudulingForm.controls.duration.patchValue(moment.duration(response.services.duration).toISOString());

          console.log(response);
          this.services = [service];

          this.scheudulingForm.controls.totalPrice.setValue(response.services.price);
        },
        error: (error) => {
          console.error(error);
        },
      });
  }
}
