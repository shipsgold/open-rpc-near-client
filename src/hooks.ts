import * as path from "path";
import { move } from "fs-extra";
import { components } from "@open-rpc/generator";

import { readFile } from "fs-extra";
import * as fs from "fs";
import { promisify } from "util";
const writeFile = promisify(fs.writeFile);
import { template } from "lodash";

const tsTemplate = template(`
// Code generated by zane generator DO NOT EDIT.
import { RequestManager, PostMessageWindowTransport, PostMessageIframeTransport, WebSocketTransport, HTTPTransport, Client, JSONRPCError } from "@open-rpc/client-js";
import _ from "lodash";
import { OpenrpcDocument as OpenRPC, MethodObject, ContentDescriptorObject } from "@open-rpc/meta-schema";
import { MethodCallValidator, MethodNotFoundError } from "@open-rpc/schema-utils-js";
import { Account, Near, Contract} from "near-api-js";
import BN from "bn.js"

<%= methodTypings.toString("typescript") %>
<% openrpcDocument.methods.forEach((method) => { %>
  /**
   * Generated typings 
   */
  // tslint:disable-next-line:max-line-length
  type GT<%= methodTypings.getTypingNames("typescript", method).method %> = [...Parameters<<%= methodTypings.getTypingNames("typescript", method).method %>>, ChangeMethodOptions?]
  type RT<%= methodTypings.getTypingNames("typescript", method).method %> = ReturnType<<%= methodTypings.getTypingNames("typescript", method).method %>>
<% }); %>

export interface Options {
    account: Account;
    contractId: string;
}

export type NearNumber = BN | string | number;

export interface ChangeMethodOptions {
  gas?: NearNumber 
  amount?: NearNumber
}

const isMetaObject = (x: any): boolean => {
  if(x && (x.gas || x.amount)) return true
  return false
}

export class <%= className %> {
  public static openrpcDocument: OpenRPC = <%= JSON.stringify(openrpcDocument) %> ;
  public contract: Contract;
  private validator: MethodCallValidator;

  constructor(options: Options) {
    const {account, contractId} = options;
    this.validator = new MethodCallValidator(<%= className %>.openrpcDocument);
    const changeMethods:string[] = [<% openrpcDocument.methods.filter((method)=> method && method.tags[0].name === "change").forEach((method)=> { %>
      "<%-method.name %>",<% }) %>
    ] 

    const viewMethods:string[] = [<% openrpcDocument.methods.filter((method)=> method.tags === undefined || method.tags.length  > 0 && method.tags[0].name !== "change").forEach((method)=> { %>
      "<%-method.name %>",<% }) %>
    ]
    this.contract = new Contract(account,contractId, {changeMethods, viewMethods})
  }

  <% openrpcDocument.methods.forEach((method) => { %>
  /**
   * <%= method.summary %>
   */
  // tslint:disable-next-line:max-line-length
  public <%= method.name %>(...params: GT<%= methodTypings.getTypingNames("typescript", method).method %>): RT<%= methodTypings.getTypingNames("typescript", method).method %> {
    //return this.request("<%= method.name %>", params);
    if(isMetaObject(params.slice(1))){
    let metaData = params.pop() as ChangeMethodOptions;
    const paramNames:string[] = [ <% method.params.forEach((param) => { %> 
      "<%= param.name %>",<% }); %>
    ]

    const paramByName = _.zipObject(paramNames, params);
    return (this.contract as any).<%=method.name%>({args: paramByName, ...metaData}) as RT<%= methodTypings.getTypingNames("typescript", method).method %> 
    }
    const paramNames:string[] = [ <% method.params.forEach((param) => { %> 
      "<%= param.name %>",<% }); %>
    ]
    const paramByName = _.zipObject(paramNames, params);
    return (this.contract as any).<%=method.name%>({args: paramByName}) as RT<%= methodTypings.getTypingNames("typescript", method).method %> 
  }
  <% }); %>
}
export default <%= className %>;
`);


const hooks: components.IHooks = {
  afterCopyStatic: [
    async (dest, frm, component): Promise<void> => {
      if (component.staticPath === undefined || component.staticPath === "") return;
      if (component.language === "typescript") {
        console.log(dest)
        return await move(path.join(dest, "_package.json"), path.join(dest, "package.json"), { overwrite: true });
      }
    },
  ],
  afterCompileTemplate: [
    async (dest, frm, component, openrpcDocument): Promise<void> => {

      if( component.staticPath === undefined || component.staticPath === "") return
      if (component.language === "typescript") {
        const packagePath = path.join(dest, "package.json");
        const fileContents = await readFile(packagePath);
        const pkg = JSON.parse(fileContents.toString());
        const updatedPkg = JSON.stringify({
          ...pkg,
          name: component.name,
          version: openrpcDocument.info.version,
        });

        return await writeFile(packagePath, updatedPkg);
      }
    },
  ],
  templateFiles: {
    typescript: [
      {
        path: "src/index.ts",
        template: tsTemplate,
      },
    ],
  },
};

export default hooks;
