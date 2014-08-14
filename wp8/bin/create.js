/*
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
*/

/*
 * create a cordova/wp8 project
 *
 * USAGE
 *  ./create [path package activity]

    ./bin/create.bat C:\Users\Me\MyTestProj "test.proj" "TestProject"
 */


var fso=WScript.CreateObject("Scripting.FileSystemObject");
var wscript_shell = WScript.CreateObject("WScript.Shell");
// working dir
var platformRoot = WScript.ScriptFullName.split('\\bin\\create.js').join('');
var repoRoot =  fso.GetParentFolderName(platformRoot);
var args = WScript.Arguments;
var destPath;


Log("platformRoot = " + platformRoot);
Log("repoRoot = " + repoRoot);


function Usage() {
    Log("Usage: create PathToNewProject [ PackageName AppName TemplatePath ]");
    Log("    PathToNewProject : The path to where you wish to create the project");
    Log("    PackageName      : The namespace for the project (default is Cordova.Example)");
    Log("    AppName          : The name of the application (default is CordovaAppProj)");
    Log("    TemplatePath      : The path to project template (default is ..\\template)");
    Log("examples:");
    Log("    create C:\\Users\\anonymous\\Desktop\\MyProject");
    Log("    create C:\\Users\\anonymous\\Desktop\\MyProject io.Cordova.Example AnApp");
}

// logs messaged to stdout and stderr
function Log(msg, error) {
    if (error) {
        WScript.StdErr.WriteLine(msg);
    }
    else {
        WScript.StdOut.WriteLine(msg);
    }
}

var ForReading = 1, ForWriting = 2, ForAppending = 8;
var TristateUseDefault = -2, TristateTrue = -1, TristateFalse = 0;

function read(filename) {
    var f=fso.OpenTextFile(filename, 1,2);
    var s=f.ReadAll();
    f.Close();
    return s;
}

// Reads content of utf-8 encoded file, removing BOM, if exist.
function readUTF8 (filename) {
    var inStream = WScript.CreateObject("ADODB.Stream");
    inStream.Charset = "UTF-8";
    inStream.Open();
    inStream.LoadFromFile(filename);
    var text = inStream.ReadText();
    inStream.Close();
    return text;
}

function write(filename, contents) {
    var f=fso.OpenTextFile(filename, ForWriting, TristateTrue);
    f.Write(contents);
    f.Close();
}

// Writes content to utf-8 encoded file. Adds BOM if necessary.
function writeUTF8 (filename, contents) {
    var outStream = WScript.CreateObject("ADODB.Stream");
    outStream.Mode = 3;
    outStream.Open();
    outStream.Charset = "UTF-8";
    outStream.WriteText(contents);
    outStream.SaveToFile(filename, 2);
    outStream.Close();
}

function replaceInFile(filename, regexp, replacement) {
    write(filename,read(filename).replace(regexp,replacement));
}

function replaceInUTF8 (filename, regexp, replacement) {
    writeUTF8(filename, readUTF8(filename).replace(regexp, replacement));
}

// deletes file if it exists
function deleteFileIfExists(path) {
    if(fso.FileExists(path)) {
        fso.DeleteFile(path);
   }
}


// executes a commmand in the shell
function exec(command) {
    var oShell=wscript_shell.Exec(command);
    while (oShell.Status == 0) {
        WScript.sleep(100);
    }
}

// executes a commmand in the shell
function exec_verbose(command) {
    //Log("Command: " + command);
    var oShell=wscript_shell.Exec(command);
    while (oShell.Status == 0) {
        //Wait a little bit so we're not super looping
        WScript.sleep(100);
        //Print any stdout output from the script
        if (!oShell.StdOut.AtEndOfStream) {
            var line = oShell.StdOut.ReadLine();
            Log(line);
        }
    }
    //Check to make sure our scripts did not encounter an error
    if (!oShell.StdErr.AtEndOfStream) {
        var line = oShell.StdErr.ReadAll();
        Log("ERROR: command failed in create.js : " + command);
        Log(line, true);
        WScript.Quit(1);
    }
}

//generate guid for the project
function genGuid() {
    var TypeLib = WScript.CreateObject("Scriptlet.TypeLib");
    strGuid = TypeLib.Guid.split("}")[0]; // there is extra crap after the } that is causing file streams to break, probably an EOF ... 
    strGuid = strGuid.replace(/[\{\}]/g,""); 
    return strGuid;
}

// creates new project in path, with the given package and app name
function create(path, namespace, name, templatePath) {
    Log("Creating Cordova-WP8 Project:");
    Log("\tPathToNewProject : " + path);
    Log("\tPackageName : " + namespace);
    Log("\tAppName : " + name);
    Log("\tTemplatePath : " + templatePath);

    // test for valid identifiers, alpha-numeric + _$
    if(!/^[a-zA-Z0-9._$]+$/g.test(namespace)) {
        namespace = namespace.replace("-","_");
        Log("Replaced '-' with '_' in PackageName : " + namespace);
    }
    // if replacing the - with a _ does not work, give up
    if(!/^[a-zA-Z0-9._$]+$/g.test(namespace)) {
        Log("Error : Invalid identifier! PackageName may only include letters, numbers, _ and $");
        Usage();
        WScript.Quit(1);
    }

    // Copy the template source files to the new destination
    fso.CopyFolder(templatePath, path);
    // copy over common files
    //fso.CopyFolder(repoRoot + "\\common", path);
    // copy the version file
    fso.CopyFile(repoRoot +'\\VERSION',path + "\\" );

    fso.CopyFile(platformRoot +'\\bin\\check_reqs.bat',path + "\\cordova\\" );
    fso.CopyFile(platformRoot +'\\bin\\check_reqs.js',path + "\\cordova\\" );

    // copy the defaults.xml into config.xml so this project can be built when create is called minus the cordova-cli
    fso.CopyFile(path + "\\cordova\\defaults.xml", path + "\\config.xml");
    
    // remove template cruft
    deleteFileIfExists(path + "\\__PreviewImage.jpg");
    deleteFileIfExists(path + "\\__TemplateIcon.png");
    deleteFileIfExists(path + "\\MyTemplate.vstemplate");

    var newProjGuid = genGuid();
    // replace the guid in the AppManifest
    replaceInUTF8(path + "\\Properties\\WMAppManifest.xml","$guid1$",newProjGuid);
    // replace safe-project-name in AppManifest
    replaceInUTF8(path + "\\Properties\\WMAppManifest.xml",/\$safeprojectname\$/g,name);
    replaceInUTF8(path + "\\Properties\\WMAppManifest.xml",/\$projectname\$/g,name);

    replaceInUTF8(path + "\\App.xaml",/\$safeprojectname\$/g,namespace);
    replaceInUTF8(path + "\\App.xaml.cs",/\$safeprojectname\$/g,namespace);

    replaceInUTF8(path + "\\MainPage.xaml",/\$safeprojectname\$/g,namespace);
    replaceInUTF8(path + "\\MainPage.xaml.cs",/\$safeprojectname\$/g,namespace);
    replaceInUTF8(path + "\\CordovaWP8AppProj.csproj",/\$safeprojectname\$/g,namespace);

    if (name != "CordovaWP8AppProj") {
        var valid_name = name.replace(/(\.\s|\s\.|\s+|\.+)/g, '_');
        replaceInUTF8(path + "\\CordovaWP8Solution.sln", /CordovaWP8AppProj/g, valid_name);
        // rename project and solution
        exec('%comspec% /c ren "' + path + '\\CordovaWP8Solution.sln" ' + valid_name + '.sln');
        exec('%comspec% /c ren "' + path + '\\CordovaWP8AppProj.csproj" ' + valid_name + '.csproj');
    }

    //clean up any Bin/obj or other generated files
    exec('cscript "' + path + '\\cordova\\lib\\clean.js" //nologo');

    // delete any .user and .sou files if any
    if (fso.FolderExists(path)) {
        var proj_folder = fso.GetFolder(path);
        var proj_files = new Enumerator(proj_folder.Files);
        for (;!proj_files.atEnd(); proj_files.moveNext()) {
            if (fso.GetExtensionName(proj_files.item()) == 'user') {
                fso.DeleteFile(proj_files.item());
            } else if (fso.GetExtensionName(proj_files.item()) == 'sou') {
                fso.DeleteFile(proj_files.item());
            }
        }
    }

    Log("CREATE SUCCESS : " + path);

}

// MAIN

if (args.Count() > 0) {
    // support help flags
    if (args(0) == "--help" || args(0) == "/?" ||
            args(0) == "help" || args(0) == "-help" || args(0) == "/help" || args(0) == "-h") {
        Usage();
        WScript.Quit(1);
    }

    destPath = args(0);
    if (fso.FolderExists(destPath)) {
        Log("Project directory already exists:", true);
        Log("\t" + destPath, true);
        Log("CREATE FAILED.", true);
        WScript.Quit(1);
    }
    else {
        // Fix trailing slash issue
        while(destPath.length && destPath.substr(destPath.length - 1,1) == "\\") {
            destPath = destPath.substr(0,destPath.length - 1);
        }
        if(!destPath.length) {
            Log("Invalid destination specified: " + args(0),true);
            WScript.Quit(1);
        }
    }



    var packageName = "Cordova.Example";
    if (args.Count() > 1) {
        packageName = args(1);
    }

    var projName = "CordovaWP8AppProj";
    if (args.Count() > 2) {
        projName = args(2);
    }

    var templatePath = platformRoot + "\\template";
    if (args.Count() > 3) {
        templatePath = args(3);
    }

    create(destPath, packageName, projName, templatePath);
}
else {
    Usage();
    WScript.Quit(1);
}

