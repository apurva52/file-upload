import { Component, OnDestroy, OnInit } from '@angular/core';
import { ResourceService, ModalPopupConfig, ModalPopupInstance, ModalPopupService } from '@ifirm';
import { ToasterService } from 'projects/ifirm-common-components/src/lib/toaster//toaster.service';
import { DmsDialogApiService } from '../dms-dialog-api.service';
import { UploadDocumentService } from './services/upload-document.service';
import { Uploaddocument } from './models/upload-document.model';
import { InsertLinkModel } from '../models/insert-link.model';
import { AppConstants, entityType, fileKind, fileSource } from '../../constants/app-constants';
import { JobModel } from '../file-save/model/job.model';
import { ContactModel } from '../file-save/model/contact.model';
import { UUID } from 'angular2-uuid';
import { FolderSelectionComponent } from '../folder-selection/folder-selection.component';
import { ErrorBoxComponent } from 'projects/ifirm-common-components/src/lib/modal-popup/error-box/error-box.component';
import { JobLookupComponent } from 'projects/ifirm-common-components/src/lib/job-lookup/job-lookup/job-lookup.component';
import { ClientLookupComponent } from 'projects/ifirm-common-components/src/lib/common-client-lookup/common-client-lookup/client-lookup.component';
import { concatMap, from, map, Subscription } from 'rxjs';


@Component({
  selector: 'app-upload-documents',
  templateUrl: './upload-documents.component.html',
  styleUrls: ['./upload-documents.component.scss', '../dms-dialog-style.scss']
})
export class UploadDocumentComponent implements OnInit, OnDestroy {
  uploadEnum = entityType;
  uploadToVal = entityType.Job
  tags: any[] = [];
  tagNames = [];
  errorMessage = '';
  totalParts: number = 1;
  partIndex: number = 0;
  partByteOffsetIndex: number = 0;
  chunkSize = 2097152;
  contactModel: ContactModel = new ContactModel();
  selectedTagList: any[] = [];
  selectedJob: JobModel = new JobModel();
  renameBtn = false;
  apiRequestExcludingLast: Uploaddocument[] = []
  tagLoaded: boolean;
  folderId: number = 1;
  hierarchy: string = null;
  loader: boolean = false;
  searchTag: string = 'Search';
  pathName = this.resourceService.getText('dms.toassign');
  errorFlag = false;
  contact: string = null;
  job: string = null;
  entityId: number = null;
  fileList: any[] = [];
  uploaConfigInfo = null;
  disAllowedFileExtensions = AppConstants.disAllowedFileExtension;
  fileVal: string;
  hrSelectVal: number;
  users: [] = [];
  entityTypes: { name: string | Promise<string>, id: number, isAllowed: boolean }[];
  uploading = false;
  headerName: string;
  roles: any;
  errorHeader = false;
  private subscriptions = new Subscription()
  constructor(private config: ModalPopupConfig<any>, private uploaddocument: UploadDocumentService, private popupservice: ModalPopupService, private instance: ModalPopupInstance, private dmsDialogApiService: DmsDialogApiService,
    private toasterService: ToasterService, private resourceService: ResourceService, private popupService: ModalPopupService) {
    this.uploaConfigInfo = config.data;
    this.uploadToVal = this.uploaConfigInfo.EntityType;
    this.entityId = this.uploaConfigInfo.EntityId;
    this.roles = this.uploaConfigInfo.UserRoles;
    this.folderId = this.uploaConfigInfo.FolderId;
    this.getSelectedFolder(this.uploaConfigInfo.Hierarchy, this.uploaConfigInfo.FolderId, this.uploaConfigInfo.EntityType)
  }

  ngOnInit(): void {
    this.entityTypes = [{ name: this.resourceService.get("ifirm.common.job"), id: entityType.Job, isAllowed: this.isAllowApmAccess() },
    { name: this.resourceService.get("ifirm.common.contact"), id: entityType.Contact, isAllowed: this.isContactAllowed() },
    { name: this.resourceService.get("dms.settings.internaldocuments"), id: entityType.Firm, isAllowed: this.isAllowInternaldocuments() },
    { name: this.resourceService.get("dms.settings.hrdocuments"), id: entityType.Hr, isAllowed: this.uploaConfigInfo.EntityType == this.uploadEnum.Hr },
    { name: this.resourceService.get("dms.fileuploaddialog.yourhrfolder"), id: entityType.Hr, isAllowed: this.uploaConfigInfo.EntityType == this.uploadEnum.User },
    { name: this.resourceService.get("dms.fileuploaddialog.youruserfolder"), id: entityType.User, isAllowed: this.uploaConfigInfo.EntityType == this.uploadEnum.User }];

    this.tagLoaded = this.tagNames.length == 0 ? false : true;
    this.uploaConfigInfo.FileKind = fileKind.File;
    this.uploaConfigInfo.FileSource = fileSource.LinkUrl;
    this.getTagList(this.uploaConfigInfo);
    if (this.uploaConfigInfo.EntityType == entityType.Hr) {
      if( this.uploaConfigInfo.EntityId !== 0 && this.uploaConfigInfo.EntityId != undefined )
      this.hrSelectVal = this.uploaConfigInfo.EntityId;
      else {
        this.hrSelectVal = Number(this.roles?.userId);
      }
      this.getUsers(false);
    }
    if (this.uploaConfigInfo.EntityType == entityType.Contact || this.uploaConfigInfo.EntityType == entityType.Job) {
      this.uploaddocument.getCurrentEntityForLookup(this.uploaConfigInfo.EntityId, this.uploaConfigInfo.EntityType).then(res => {
        if (res) {
          if (this.uploaConfigInfo.EntityType == entityType.Contact)
            this.contact = res.Name;
          if (this.uploaConfigInfo.EntityType == entityType.Job)
            this.job = res.Name;
        }
      })
    }

  }
  
  getUsers(displaySystemUserAsSharedFolder) {
    this.uploaddocument.getUsers(displaySystemUserAsSharedFolder).then(res => {
      this.users = res ? res : []
    }
    )
  }

  closePopup(result: boolean): void {
    this.instance.close(result);
  }

  folderPopup(): void {
    if (!this.checkJobandContactField())
      return;
    const data = {
      EntityId: (this.uploadToVal == entityType.Firm) ? 1 : this.entityId,
      EntityType: this.uploaConfigInfo.EntityType,
      CurrentFolderId: this.folderId || 0,
      CurrentFolderhierarchy: this.uploaConfigInfo.Hierarchy
    }
    const config = new ModalPopupConfig();
    config.data = data;
    let instance = this.popupservice.open<FolderSelectionComponent>(this.resourceService.getText('dms.selectfolder'), FolderSelectionComponent, config);
    const subscription = instance.afterClosed.subscribe(result => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (result !== null) {
        this.getSelectedFolder(result.Hierarchy, result.FolderId, this.uploaConfigInfo.entityType, true)
        this.folderId = result.FolderId;
        this.hierarchy = result.Hierarchy;
      }
    });

  }
  private getFolderHierarchy(hierarchy) {
    this.dmsDialogApiService.getFolderHierarchy(hierarchy).then(res => {
      if (res && res.FolderHierarchies) {
        this.pathName = res.FolderHierarchies.map(x => x.FolderName).reduce((fullName, folderName) =>
          fullName ? `${fullName}/${folderName}` : folderName, "");
      }
    });
  }

  private getSelectedFolder(Hierarchy, folderId, entityType, flag=false) :void {
    this.pathName = "";
    const hierarchy = `${Hierarchy}/${folderId}`;
    if (flag) {
      this.getFolderHierarchy(hierarchy)
    }
    else {
      if ((folderId === undefined || folderId === null || folderId <= 0) && (Hierarchy === undefined || Hierarchy === null)) {
        this.setDefaultPath(entityType);
      }
      else if ((folderId !== null || folderId >= 0) && (Hierarchy !== null)) {
        this.getFolderHierarchy(hierarchy)
      }
      else {
        this.pathName = this.uploaConfigInfo.FolderName;
      }
    }
  }

  private setDefaultPath(entityType) :void {
    if (entityType === this.uploadEnum.Contact) {
      this.pathName = this.resourceService.getText('dms.toassign');
    }
    else if (entityType === this.uploadEnum.Firm) {
      this.entityId = 1;
      this.folderId = this.uploaConfigInfo.InternalDocumentsFolderId;
      this.pathName = this.resourceService.getText('dms.home.internaldocuments');
    }
    else {
      this.pathName = "<root>";
    }
  }
  onChange(event: any): void {
    const filedata = Object.values(event.target.files)
    this.getFileData(filedata);
    this.createFileStructure(this.checkDuplicateFile(filedata))
    if (this.fileList.length > 0)
      this.errorFlag = false;
  }

  getFileData(files) {
    for (const data of files) {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        data.filedata = fileReader.result;
      }
      fileReader.readAsDataURL(data);
    }
    return files
  }

  createFileStructure(filelist): void {
    this.fileList.push(...filelist.map(res => {
      res['disabled'] = true;
      res['ext'] = res.name
      return res;
    }))

  }
  renameFile(file, i): void {
    const splname = this.fileList[i].ext.split('.')[0];
    this.renameBtn = true;
    this.fileList[i]['ext'] = splname
    this.fileList[i]['disabled'] = false;
  }
  removeFile(id): void {
    this.errorFlag = false;
    this.fileList.splice(id, 1)
  }
  save(id, fname): void {
    this.fileList[id]['disabled'] = true;
    this.fileList[id].ext = fname + '.' + this.fileList[id].name.split('.')[1];
  }

  checkJobandContactField(): boolean {
    if (!(!!this.contact) && this.uploadToVal == entityType.Contact) {
      this.loader = false;
      this.popupService.open<ErrorBoxComponent>(this.resourceService.getText('ifirm.common.error'), ErrorBoxComponent, { data: this.resourceService.getText('dms.fileuploaddialog.selectcontacterror') });
      return false;
    }
    if (!(!!this.job) && this.uploadToVal == entityType.Job) {
      this.loader = false;
      this.popupService.open<ErrorBoxComponent>(this.resourceService.getText('ifirm.common.error'), ErrorBoxComponent, { data: this.resourceService.getText('dms.fileuploaddialog.selectjoberror') });
      return false;
    }
    return true;
  }

  async uploadFiles() {

    this.loader = true;
    if (!this.checkJobandContactField())
    return;

    if (this.fileList.length == 0) {
      this.loader = false;
      this.errorMessage = this.resourceService.getText('fe.fineuploader.messages.nofileserror');
      this.errorFlag = true;
      return;
    }
   

    if (this.uploadToVal == entityType.Job)
      this.headerName = this.resourceService.getText('dms.fileuploaddialog.uploadingfiles', ['Job', this.job])
    if (this.uploadToVal == entityType.Contact)
      this.headerName = this.resourceService.getText('dms.fileuploaddialog.uploadingfiles', ['Contact', this.contact])

    const filedata = {} as Uploaddocument;
    filedata.FolderId = this.folderId;
    filedata.TagIds = this.selectedTagList.map(item => item.id).join('');
    filedata.Hierarchy = this.hierarchy;
    if (this.uploadToVal == entityType.Hr)
      this.entityId = Number(this.hrSelectVal);
    filedata.EntityId = this.entityId;
    filedata.ChunkSize = this.chunkSize
    this.uploading = true;
    let fileIds: number[] = [];
    const mbSize = 1048576;
    this.subscriptions.add(from(this.fileList).pipe(
      map((val, index) => [val, index])
    ).subscribe(async ([k, id]) => {

      filedata.FileName = k.ext;
      filedata.FileGuid = UUID.UUID();
      filedata.EntityType = this.uploadToVal;
      this.fileList[id]['error'] = false;
      this.fileList[id]['progressVal'] = 1;
      filedata.FileData = k;
      filedata.Size = k.size;
      this.fileList[id]['fileSizeMB'] = `${(filedata.Size / mbSize).toFixed(2)} MB`;
      let uploadRequest = await this.BuildUploadRequest(filedata.FileData, filedata);

      if (uploadRequest.length > 1) {
        // fetch request excuding last request
        this.apiRequestExcludingLast = uploadRequest;
        this.lareSizeFileApiCall(this.apiRequestExcludingLast, id)
      }
      else {
        this.uploaddocument.uploadFilesInChunk(uploadRequest[0]).then(res => {
          if (res && res.success) {
            this.fileList[id]['progressVal'] = Number(this.fileList[id]['progressVal'] * 100);

            fileIds.push(res.data)

            if (id == this.fileList.length - 1) {
              this.uploaddocument.updateRetentionDateForFiles(fileIds);
              this.loader = false;
              this.instance.close({ result: false });
              this.toasterService.success(this.resourceService.getText('fe.fileuploaddialog.uploadedsuccessfully'));
            }
          }
          else {
            this.fileList[id].error = true;
            this.errorHeader = true;
          }

        },
          (error) => {
            this.errorHeader = true;
            this.fileList[id].error = true;
          })
      }
    }))
  }

  lareSizeFileApiCall(filedata, id): void {

    this.subscriptions.add(from(this.apiRequestExcludingLast).pipe(
      concatMap(userId =>
        this.uploaddocument.uploadFilesInChunk(userId))).subscribe(res => {
          this.fileList[id]['progressVal'] += Number((100 / filedata[0].TotalParts).toFixed());
          if (res.data != 0) {
            this.fileList[id]['progressVal'] = 100;
            let fileIds: number[] = [];
            fileIds.push(res.data)
            this.uploaddocument.updateRetentionDateForFiles(fileIds);
            if (id == this.fileList.length - 1) {
              this.loader = false;
              this.instance.close({ result: false });
              this.toasterService.success(this.resourceService.getText('fe.fileuploaddialog.uploadedsuccessfully'));
            }
          }
        }, (error) => {
          this.loader = false;
          this.errorHeader = true;
          this.fileList[id].error = true;
        }
        ))
  }

  private getTagList(insertLinkInfo: InsertLinkModel): void {
    this.loader = true
    this.dmsDialogApiService.GetTagList(insertLinkInfo).then(res => {
      this.loader = false;
      this.tagNames = res.TagList;
      this.tags = res.TagList.map((value) => ({
        id: value.TagId,
        name: value.TagNameForDisplay
      }));
      if (this.tags.length != 0) {
        this.tagLoaded = true;
      }
    }).catch(
      exception => {
        this.loader = false;
        this.toasterService.error(this.resourceService.getText('dms.common.errormessage'));
      });
  }


  dropped(e): void {
    const file_data = []
    for (const droppedFile of e) {
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file(fileData => {
          file_data.push(fileData)
          if (file_data.length == e.length) {
            this.getFileData(file_data);
            this.checkDuplicateFile(file_data)
            this.createFileStructure(this.checkDuplicateFile(file_data))
          }
          e.size = fileData.size
        })
      }
    }

  }
  checkDuplicateFile(filelist) {
    if (this.fileList.length > 0) {
      for (const [id, filedata] of filelist.entries()) {
        this.fileList.forEach((res) => {
          if(!this.validateFileNameLength(filedata.name)){     
          this.errorMessage = this.resourceService.getText('ifirm.common.filenamevalidationmsg', [AppConstants.maxFileNameLength])
              filelist.splice(id, 1);
              this.errorFlag = true
          }
          if (res.ext == filedata.name) {
            filelist.splice(id, 1);
            this.errorMessage = this.resourceService.getText('dms.fileuploaddialog.filenameexists');
            this.errorFlag = true;
          }
        }
        )
      }
      return filelist
    }
    else{
      if(!this.validateFileNameLength(filelist[0].name)){     
        this.errorMessage = this.resourceService.getText('ifirm.common.filenamevalidationmsg', [AppConstants.maxFileNameLength])
            this.errorFlag = true
            }
            else 
            return filelist
    }
    
  }

  validateFileNameLength(fileName) :boolean{
    const dotExtIndex = fileName.lastIndexOf(".");
     const name = fileName.substring(0, dotExtIndex);
      return name && name.length > AppConstants.maxFileNameLength ? false : true;
  }

  showContactLookup(): void {
    const config = new ModalPopupConfig();
    let instance = this.popupservice.open<ClientLookupComponent>(this.resourceService.getText('ifirm.common.contactlookup'), ClientLookupComponent, config);
    const subscription = instance.afterClosed.subscribe(result => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (result !== null) {
        this.entityId = Number(result.data.id);
        this.contact = result.data.clientName;
      }
    });
  }


  showJobLookup(): void {
    const config = new ModalPopupConfig();
    let instance = this.popupservice.open<JobLookupComponent>(this.resourceService.getText('ifirm.common.joblookup'), JobLookupComponent, config);
    const subscription = instance.afterClosed.subscribe(result => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (result !== null) {
        this.entityId = Number(result.data.clientId);
        this.job = result.data.clientName;
      }
      this.folderId = result.FolderId;
      this.hierarchy = result.Hierarchy;

    });
  }

  UploadChange(e): void {
    this.folderId = null;
    const pathVal = e.target.value;
    if (pathVal == this.uploadEnum.Hr) {
      if (this.users.length == 0)
        this.getUsers(false);
    }
    this.setDefaultPath(Number(pathVal));
  }

  async BuildUploadRequest(fileData: any, uploaddocumentRequest: Uploaddocument): Promise<Uploaddocument[]> {
    let uploadRequests: Uploaddocument[] = [];
    let fileguid = UUID.UUID()
    const blob = new Blob([fileData]);
    if (this.chunkSize >= uploaddocumentRequest.Size) {
      uploaddocumentRequest.TotalParts = 1;
    } else {
      this.totalParts = uploaddocumentRequest.Size / this.chunkSize;
      uploaddocumentRequest.TotalParts = Math.ceil(this.totalParts);
    }
    let i = 0;
    let startOffsetIndex = 0;
    let totalOffsetIndex = 0;
    do {
      var uploadRequest = new Uploaddocument();
      if (uploaddocumentRequest.Size < (totalOffsetIndex + this.chunkSize)) {
        totalOffsetIndex = totalOffsetIndex + (blob.size - totalOffsetIndex);
      }
      else {
        totalOffsetIndex = totalOffsetIndex + this.chunkSize;
      }
      let slice: BlobPart = blob.slice(startOffsetIndex, totalOffsetIndex);
      startOffsetIndex = startOffsetIndex + this.chunkSize;
      uploadRequest.PartIndex = i;
      uploadRequest.PartByteOffsetIndex = i == 0 ? 0 : totalOffsetIndex;
      uploadRequest.FileData = [slice];
      uploadRequest.Size = uploaddocumentRequest.Size;
      uploadRequest.TotalParts = uploaddocumentRequest.TotalParts;
      uploadRequest.ChunkSize = uploaddocumentRequest.ChunkSize;
      uploadRequest.createdDateTime = uploaddocumentRequest.createdDateTime;
      uploadRequest.Source = uploaddocumentRequest.Source;
      uploadRequest.EntityType = uploaddocumentRequest.EntityType;
      uploadRequest.TagIds = uploaddocumentRequest.TagIds;
      uploadRequest.EntityId = uploaddocumentRequest.EntityId;
      uploadRequest.Hierarchy = uploaddocumentRequest.Hierarchy;
      uploadRequest.FolderId = uploaddocumentRequest.FolderId;
      uploadRequest.FileGuid = fileguid;
      uploadRequest.FileName = uploaddocumentRequest.FileName;
      uploadRequest.IsUploadFromTrayapp = uploaddocumentRequest.IsUploadFromTrayapp;
      uploadRequests.push(uploadRequest);
      i++;
    } while (i < uploaddocumentRequest.TotalParts)

    return uploadRequests;
  }

  private isAllowApmAccess(): boolean {
    return this.roles.allowApmAccess && this.roles.viewUpload;
  }

  private isAllowInternaldocuments(): boolean {
    return this.roles.internalDocumentsViewEdit && this.roles.firmDocuments;
  }

  private isContactAllowed(): boolean {
    return this.roles.viewUpload && this.roles.contactView;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe()
  }
}
