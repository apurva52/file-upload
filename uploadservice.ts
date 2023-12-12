import {  Injectable } from '@angular/core';
import { ApiService } from '@ifirm';
import {  retry } from 'rxjs';
import { Uploaddocument } from '../models/upload-document.model';


@Injectable({
  providedIn: 'root'
})
export class UploadDocumentService {

  constructor(private api: ApiService) { }
  
  public uploadFilesInChunk(uploaddocument: Uploaddocument): Promise<any> {
    const formParams = new FormData();
    const file = new File(uploaddocument.FileData, uploaddocument.FileName);
    formParams.append('metaData[entityType]', uploaddocument.EntityType.toString());
    formParams.append('metaData[entityId]', uploaddocument.EntityId.toString());
    formParams.append('metaData[tagIds]', uploaddocument.TagIds.toString());
    formParams.append('metaData[folderId]', uploaddocument.FolderId != undefined ? uploaddocument.FolderId.toString() : null);
    formParams.append('metaData[hierarchy]', uploaddocument.Hierarchy);
    formParams.append('qqpartindex', uploaddocument.PartIndex.toString());
    formParams.append('qqpartbyteoffset', uploaddocument.PartByteOffsetIndex.toString());
    formParams.append('qqchunksize', uploaddocument.ChunkSize.toString());
    formParams.append('qqtotalparts', uploaddocument.TotalParts.toString());
    formParams.append('qqtotalfilesize', uploaddocument.Size.toString());
    formParams.append('qqfilename', uploaddocument.FileName);
    formParams.append('qquuid', uploaddocument.FileGuid);
    formParams.append('qqfile', file);
    return this.api.post('dms/api/document/UploadDocumentInChunk', null, formParams).pipe(retry(3)).toPromise();
  }

  public updateRetentionDateForFiles(fileIds: number[]): Promise<any> {
    const data = { fileIds: fileIds };
    return this.api.post<any>('/dms/api/document/updateretentiondateforfiles', null, data).toPromise();
  }
  
  public getUsers(displaySystemUserAsSharedFolder:boolean): Promise<any> {
    const url = `dms/api/user/getusers?IncludeSystemFolder=${displaySystemUserAsSharedFolder}`;
    return this.api.get<any>(url).toPromise();
  }

  public getCurrentEntityForLookup(EntityId:number,EntityType:number):Promise<any>{
   const url = `dms/api/documentsearch/getcurrententityforlookup?EntityId=${EntityId}&EntityType=${EntityType}`;
   return this.api.get<any>(url).toPromise();
 
  }
}
