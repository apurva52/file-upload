import { Component, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { FormGroup} from '@angular/forms';
import { ResourceService, ModalPopupConfig, ModalPopupInstance, ModalPopupService } from '@ifirm';
import { ToasterService } from 'projects/ifirm-common-components/src/lib/toaster//toaster.service';
import { AddFolderModel } from '../models/add-folder.model';
import { DmsDialogApiService } from '../dms-dialog-api.service';
import { DmsDialogService } from '../dms-dialog.service';
import { PdfdocumentService } from '../../pdf/pdfdocument.service';
import { Pdfdocument } from '../../pdf/pdfdocument.model';
import { InsertLinkModel } from '../models/insert-link.model';
import { entityType, fileKind, fileSource } from '../../constants/app-constants';
import { JobModel } from '../file-save/model/job.model';
import { ContactModel } from '../file-save/model/contact.model';
import { ClientLookupService } from 'projects/ifirm-common-components/src/lib/common-client-lookup/common-client-lookup/client-lookup.service';
import { JobLookupService } from 'projects/ifirm-common-components/src/lib/job-lookup/job-lookup/job-lookup.service';
import { WebviewerComponent } from '../../pdf/webviewer/webviewer.component';


@Component({
  selector: 'app-upload-documents',
  templateUrl: './upload-documents.component.html',
  styleUrls: ['./upload-documents.component.scss', '../dms-dialog-style.scss']
})
export class UploadDocumentComponent implements OnInit {
  @ViewChild(WebviewerComponent) webviewercomp:WebviewerComponent
  uploadTo = 'number:4'
  tags: any[] = [];
  tagNames = [];
  totalParts : number = 1;
  partIndex: number = 0;
  partByteOffsetIndex: number = 0;
  chunkSize = 2688438;
  imgType = ".jpeg,.pdf,.png"
  contactModel: ContactModel = new ContactModel();
  selectedTagList: any[] = [];
  selectedJob: JobModel = new JobModel();
  renameBtn = false;
  tagLoaded: boolean;
  folderId: number = 1;
  enhancedmaxSize = 23333000;
  hierarchy: string = null;
  addFolderForm: FormGroup;
  entityInfo: AddFolderModel = null;
  rData: boolean = false;
  searchTag: string = 'Search';
  pathName = 'To Assign';
  contact: string = null;
  job :string = null;
  entityId: number = null;
  fileList: any[] = [];
  insertLinkInfo: InsertLinkModel = null;
  disAllowedFileExtensions: ".txt";
  fileVal: string;
  @ViewChild("myFile") myFileRef: ElementRef;


  constructor(private config: ModalPopupConfig<any>, private pdfdocument: PdfdocumentService, private joblookupservice:JobLookupService, private folderData: ModalPopupService, private dmsDialogService: DmsDialogService, private instance: ModalPopupInstance, private dmsDialogApiService: DmsDialogApiService,
    private toasterService: ToasterService, private resourceService: ResourceService, private clientlookupservice: ClientLookupService) {
    this.insertLinkInfo = config.data as InsertLinkModel;
    this.entityInfo = config.data as AddFolderModel;
  }

  ngOnInit(): void {
    this.tagLoaded = this.tagNames.length == 0 ? false : true;
    this.insertLinkInfo.FileKind = fileKind.File;
    this.insertLinkInfo.FileSource = fileSource.LinkUrl;
    this.getTagList(this.insertLinkInfo);

  }

  // private getCurrentEntityForLookup(entityId: number, entityTypes: entityType) {
  //   this.dmsDialogApiService.getCurrentEntityForLookup(entityId, entityTypes).then(res => {
  //     if (res) {
  //       if (entityTypes === entityType.Job) {
  //         this.selectedJob.jobCode = res.EntityId.toString();
  //         this.selectedJob.contactCode = res.JobType;
  //         this.selectedJob.contactName = res.Name;
  //         this.contactModel.ContactName = res.Name;
  //         this.selectedJob.EntityId = res.EntityId;
  //      //   this.selectedJob.EntityType = entityType.Job;
  //        // this.selectedJob.Id = this.dmsFile.Id;
  //         this.createDefaultFolders(this.selectedJob.EntityId, this.selectedJob.EntityType);
  //       }
  //       if (entityTypes === entityType.Contact) {
  //         this.selectedClient.ClientId = this.contactModel.EntityId = res.EntityId;
  //         this.contactModel.EntityType = entityType.Contact;;
  //         this.selectedClient.ClientName = this.contactModel.ContactName = res.Name;
  //         this.contactModel.Id = this.dmsFile.Id;
  //         this.createDefaultFolders(this.contactModel.EntityId, this.contactModel.EntityType);

  //       }
  //       this.changeFolderEnabled = false;
  //     }
  //   });
  // }

  private createDefaultFolders(entityId: number, entityTypes: entityType) {
    this.dmsDialogApiService.createDefaultFolders(entityId, entityTypes).then(res => {
      // if (res && res.data != undefined) {
      //   this.toAssignFolderId = res.data;
      //   if (this.dmsFile.Hierarchy == undefined || this.dmsFile.Hierarchy == null) {
      //     this.contactModel.FolderId = this.toAssignFolderId;
      //   }
      // }
    });
  }
  closePopup(result: boolean): void {
    this.instance.close(result);
  }

  folderPopup(): void {
    let data = {
      "EntityType": 3,
      "EntityId": "1134",
      "CurrentFolderId": 0,
      "CurrentFolderhierarchy": null,
      "isImmediateFolder": false
    }
    this.dmsDialogService.openDialog('folderselection', data, null);
    this.folderData.postdata.subscribe((res) => {
      this.folderId = res.tree.FolderId;
      this.hierarchy = res.tree.Hierarchy;
      this.pathName = res.name;

    });
  }
  onChange(event: any): void {
    const filedata = Object.values(event.target.files)
    this.getFileData(filedata);
    this.craeteFileStructure(this.checkDuplicateFile(filedata))
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

  craeteFileStructure(filelist): void {
    for (const file of filelist) {
      file['disabled'] = true;
      file['ext'] = file.name
      this.fileList.push(file);
    }
  }
  renameFile(file, i): void {
    const splname = this.fileList[i].ext.split('.')[0];
    this.renameBtn = true;
    this.fileList[i]['ext'] = splname
    this.fileList[i]['disabled'] = false;
  }
  removeFile(id): void {
    this.fileList.splice(id, 1)
  }
  save(id): void {
    this.fileList[id]['disabled'] = true;
    this.fileList[id].ext = document.getElementById(id)['value'] + '.' + this.fileList[id].name.split('.')[1];
  }

  async uploadFiles() {
    //this.rData = true;
    if (this.fileList.length == 0) {
      this.rData = false;
      this.toasterService.error('No files to upload.');
      return;
    }

    if (this.contact == null && this.uploadTo == 'number:3') {
      this.rData = false;
      this.toasterService.error('Please select a contact.');
      return;
    }

    if (this.job == null && this.uploadTo == 'number:4') {
      this.rData = false;
      this.toasterService.error('Please select a Job');
      return;
    }
    let filedata = {} as Pdfdocument;
    filedata.FolderId = this.folderId;
    filedata.TagIds = this.selectedTagList.map(item => item.id).join('');
    filedata.Hierarchy = this.hierarchy;
    filedata.EntityId = this.entityId;
    filedata.ChunkSize = this.chunkSize
    for (const [id, k] of this.fileList.entries()) {
      filedata.FileName = k.ext;

      filedata.EntityType = 3
      filedata.FileData = k.filedata.split(':')[1];
      filedata.Size = k.size;

    var uploadRequest = await this.BuildUploadRequest(filedata.FileData, filedata);
    console.log('req',uploadRequest)

    if(this.enhancedmaxSize < filedata.Size)
    {
      const pdfMaxSizeInMB : string =  ((1000 / 1024)/1024).toString();
      this.toasterService.error(this.resourceService.getText('dms.editpdf.pdfmaxsize').replace('{0}', pdfMaxSizeInMB));
      this.rData = false;
      return;
    }

    if (uploadRequest.length > 1) {
      let firstAPIRequest = (uploadRequest[0].TotalParts - 1);
      // fetch request excuding last request
      let apiRequestExcludingLast = uploadRequest.filter(x => x.PartIndex < firstAPIRequest);
      //Last API Request
      let lastApiRequest = uploadRequest.find(x => x.PartIndex === firstAPIRequest);
      let count = 0;
      apiRequestExcludingLast.forEach(async (request: Pdfdocument) => {
        this.pdfdocument.uploadPdfFilesInChunk(request).then(response => {
          if (response && response.success) {
            count++;
            if (count === apiRequestExcludingLast.length) {
              this.pdfdocument.uploadPdfFilesInChunk(lastApiRequest).then(res => {
                if (res && res.success) {
                  let fileIds: number[] = [];
                  fileIds.push(res.data)
                  this.pdfdocument.updateRetentionDateForFiles(fileIds);
                  this.toasterService.success(this.resourceService.getText('dms.editpdf.success'));
                }
                else {
                  this.toasterService.error(this.resourceService.getText('dms.editpdf.error'));
                }
                this.rData = false;
               // this.cdRef.detectChanges();
              })
            }
          }
          else {
            this.rData = false;
            this.toasterService.error(this.resourceService.getText('dms.editpdf.error'));
           // this.cdRef.detectChanges();
          }
        })
      });
    }
    else {
      this.pdfdocument.uploadPdfFilesInChunk(uploadRequest[0]).then(res => {
        if (res && res.success) {
          let fileIds: number[] = [];
          fileIds.push(res.data)
          this.pdfdocument.updateRetentionDateForFiles(fileIds);
          this.toasterService.success(this.resourceService.getText('dms.editpdf.success'));
        }
        else {
          this.toasterService.error(this.resourceService.getText('dms.editpdf.error'));
        }

        //this.cdRef.detectChanges();
        this.rData = false;
      })
    }

    }
  }

  private getTagList(insertLinkInfo: InsertLinkModel): void {
    this.rData = true
    this.dmsDialogApiService.GetTagList(insertLinkInfo).then(res => {
      this.rData = false;
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
        this.rData = false;
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
            this.craeteFileStructure(this.checkDuplicateFile(file_data))
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
          if (res.ext == filedata.name) {
            filelist.splice(id, 1);
            this.toasterService.error('This file has already been selected and will not be uploaded.');

          }
        }
        )
      }
      return filelist
    }
    return filelist;
  }

  showContactLookup(): void {
    this.dmsDialogService.openDialog('contactLookup', null, null);
    this.clientlookupservice._selectclientdata.subscribe(res => {
      this.entityId = Number(res.id);
      this.contact = res.clientName;
    })
  }
  showJobLookup(): void {
    this.dmsDialogService.openDialog('jobLookup', null, null);
    this.joblookupservice.selectjobdata.subscribe(res => {
      this.entityId = Number(res.jobId);
      this.job = res.clientName;
    })
  }

  async BuildUploadRequest(fileData: any, pdfdocumentRequest: Pdfdocument): Promise<Pdfdocument[]> {
    console.log('build',pdfdocumentRequest)
    let uploadRequests: Pdfdocument[] = [];
    const blob = new Blob([fileData], { type: 'application/pdf' });
    if (this.chunkSize >= blob.size) {
      pdfdocumentRequest.TotalParts = 1;
    } else {
      this.totalParts = blob.size / this.chunkSize;
      pdfdocumentRequest.TotalParts = Math.ceil(this.totalParts);
    }
    let i = 0;
    let startOffsetIndex = 0;
    let totalOffsetIndex = 0;
    do {
      var uploadRequest = new Pdfdocument();
      if (blob.size < (totalOffsetIndex + this.chunkSize)) {
        totalOffsetIndex = totalOffsetIndex + (blob.size - totalOffsetIndex);
      }
      else {
        totalOffsetIndex = totalOffsetIndex + this.chunkSize;
      }
      var slice: BlobPart = blob.slice(startOffsetIndex, totalOffsetIndex);
      startOffsetIndex = startOffsetIndex + this.chunkSize;
      uploadRequest.PartIndex = i;
      uploadRequest.PartByteOffsetIndex = totalOffsetIndex;
      uploadRequest.FileData = [slice];
      uploadRequest.Size = blob.size;
      uploadRequest.TotalParts = pdfdocumentRequest.TotalParts;
      uploadRequest.ChunkSize = pdfdocumentRequest.ChunkSize;
      uploadRequest.createdDateTime = pdfdocumentRequest.createdDateTime;
      uploadRequest.Source = pdfdocumentRequest.Source;
      uploadRequest.EntityType = pdfdocumentRequest.EntityType;
      uploadRequest.TagIds = pdfdocumentRequest.TagIds;
      uploadRequest.EntityId = pdfdocumentRequest.EntityId;
      uploadRequest.Hierarchy = pdfdocumentRequest.Hierarchy;
      uploadRequest.FolderId = pdfdocumentRequest.FolderId;
      uploadRequest.FileGuid = pdfdocumentRequest.FileGuid;
      uploadRequest.FileName = pdfdocumentRequest.FileName;
      uploadRequest.IsUploadFromTrayapp = pdfdocumentRequest.IsUploadFromTrayapp;
      uploadRequests.push(uploadRequest);
      i++;
    } while (i < pdfdocumentRequest.TotalParts)

    return uploadRequests;
  }
}
