import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { ApiService } from '@ifirm';
import { UUID } from 'angular2-uuid';
import { forkJoin, Observable, ReplaySubject, retry } from 'rxjs';
import { LockType } from '../constants/app-constants';
import { Pdfdocument } from './pdfdocument.model';
import { Pdfsettings } from './pdfsettings.model'

@Injectable({
  providedIn: 'root'
})
export class PdfdocumentService {

  private _loadedLibraries: { [url: string]: ReplaySubject<void> } = {};

  constructor(@Inject(DOCUMENT) private readonly document: any, private api: ApiService) { }

  lazyLoadPdfTron(buildNumber: number): Observable<any> {
    return forkJoin([
      this.loadScript('wv-resources/lib/webviewer.min-' + buildNumber + '.js')
      ,this.loadScript('wv-resources/lib/core/webviewer-core.min-' + buildNumber + '.js')
      ,this.loadScript('wv-resources/lib/ui/webviewer-ui.min-' + buildNumber + '.js')
    ]);
  }

  private loadScript(url: string): Observable<any> {
    if (this._loadedLibraries[url]) {
      return this._loadedLibraries[url].asObservable();
    }
    this._loadedLibraries[url] = new ReplaySubject();

    const script = this.document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = url;
    script.onload = () => {
      this._loadedLibraries[url].next();
      this._loadedLibraries[url].complete();
    };

    this.document.body.appendChild(script);

    return this._loadedLibraries[url].asObservable();

  }

  GetApplicationVersion(): Promise<any> {
    const uri = 'fe/2/login/GetAppVersion';
    return this.api.get(uri).toPromise();
  }

  GetFileStreamAsync(fileId: number): Observable<Blob> {
    const uri = 'dms/api/document/GetFileStreamAsync?id=' + fileId;
    return this.api.get(uri, null, { responseType: 'blob' });
  }

  GetEnhancedpdfSettings(): Observable<Pdfsettings> {
    const uri = 'dms/api/settings/GetEnhancedpdfSettings';
    return this.api.get(uri);
  }

  public uploadPdfFilesInChunk(pdfdocument: Pdfdocument): Promise<any> {
    let formParams = new FormData();
    let file = new File(pdfdocument.FileData, pdfdocument.FileName);
    formParams.append('metaData[entityType]', pdfdocument.EntityType.toString());
    formParams.append('metaData[entityId]', pdfdocument.EntityId.toString());
    formParams.append('metaData[tagIds]', pdfdocument.TagIds.toString());
    formParams.append('metaData[folderId]', pdfdocument.FolderId != undefined ? pdfdocument.FolderId.toString() : null);
    formParams.append('metaData[hierarchy]', pdfdocument.Hierarchy);
    formParams.append('qqpartindex', pdfdocument.PartIndex.toString());
    formParams.append('qqpartbyteoffset', pdfdocument.PartByteOffsetIndex.toString());
    formParams.append('qqchunksize', pdfdocument.ChunkSize.toString());
    formParams.append('qqtotalparts', pdfdocument.TotalParts.toString());
    formParams.append('qqtotalfilesize', pdfdocument.Size.toString());
    formParams.append('qqfilename', pdfdocument.FileName);
    formParams.append('qquuid', UUID.UUID());
    //formParams.append('IsUploadFromTrayapp', pdfdocument.IsUploUSadFromTrayapp.toString());
    formParams.append('qqfile', file);

    
    
    return this.api.post('dms/api/document/UploadDocumentInChunk', null, formParams).pipe(retry(3)).toPromise();
  }

  public getFolderHierarchy(hierarchy: any): Promise<any> {
    return this.api.get<any>('/dms/api/document/getfolderhierarchy?hierarchy=' + hierarchy).toPromise();
  }

  public updateRetentionDateForFiles(fileIds: number[]): Promise<any> {
    let data = { FileIds: fileIds };
    return this.api.post<any>('/dms/api/document/updateretentiondateforfiles', null, data).toPromise();
  }

  public getDocumentById(fileId: number): Promise<any> {
    return this.api.get<any>('/dms/api/document/GetDocumentById?fileId=' + fileId).toPromise();
  }

  public LockFiles(fileIds: string[], lockType: LockType): Promise<any> {
    let data = { fileIds: fileIds, lockType: lockType };
    return this.api.post<any>('/dms/api/document/lockFileForEdit', null, data).toPromise();
  }

  public unLockFiles(fileIds: number[], lockType: LockType): Promise<any> {
    let data = { fileIds: fileIds, lockType: lockType };
    return this.api.post<any>('/dms/api/document/UnLockFiles', null, data).toPromise();
  }

  public updateLastEditedDateTimeForFiles(fileIds: number[]): Promise<any> {
    let data = { FileIds: fileIds };
    return this.api.post<any>('/dms/api/document/updateLastEditedDateTimeForFiles', null, data).toPromise();
  }

}
