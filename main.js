const fs = require("fs");
const path = require("path");
const {app, BrowserWindow, ipcMain} = require("electron");
const PDFWindow = require("electron-pdf-window");
var store = require("./store");
const fetch = require("node-fetch");
var unfluff = require("unfluff");
var ElectronPDF = require("electron-pdf");
var schedule = require("node-schedule");
const printer = require("pdf-to-printer");
var exporter = new ElectronPDF();
var mainWindow = null;
var pdfThing = null;
try{if(require("electron-squirrel-startup")){return app.quit();}}catch{}
function createWindow(){
  mainWindow = new BrowserWindow({
    title: "Pepper",
    width: 335,
    height: 626,
    webPreferences: {
      nodeIntegration: true
    },
    icon: "icon.png",
    titleBarStyle: "hiddenInset"
  });
  mainWindow.loadFile("index.html");
}
function printNewspaper(toPrint){
  if(store.get("newspaper")){
    if(store.get("newspaper") == "nyt"){
      fetch("https://api.nytimes.com/svc/topstories/v2/home.json?api-key=TZI2Jcb89nm3dAARQ5FlhGXvU8a86mnB").then(function(response){
        if(response.ok){
          return response.json();
        }
      }).then(function(data){
        var articles = [];
        data.results.forEach(function(article){
          fetch(article.url).then(function(response){
            if(response.ok){
              return response.text();
            }
          }).then(function(data){
            var parsedData = unfluff(data);
            articles.push({
              title: article.title,
              content: parsedData.text,
              imageUrl: parsedData.image
            });
          });
        });
        var htmlData = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><title>Pepper News Report</title><link href=\"https://fonts.googleapis.com/css?family=Merriweather:400,700\" rel=\"stylesheet\" type=\"text/css\"/><style>body,input,button,submit{font-family:\"Merriweather\",sans-serif;}body{margin:0;padding:2rem;}.main img{min-width:100%;}</style></head><body><div style=\"width:100%;text-align:center;\"><img src=\"https://i.ibb.co/60m7FgF/icon.png\" type=\"image/png\" style=\"display:inline-block;width:100px;height:100px;\"/></div><br/><br/><div class=\"main\">";
        articles.forEach(function(article){
          htmlData = htmlData + `<img src="https://api.allorigins.win/raw?url=${encodeUriComponent(article.imageUrl)}"><br/><h1>${article.title}</h1><br/>${article.content}<br/><br/>`;
        });
        htmlData = htmlData + "</div></body></html>";
        exporter.createJob(htmlData, "newspaper.pdf", {pageSize: store.get("paper")}, {inMemory: false}).then(function(job){
          job.on('job-complete', function(r){
            if(toPrint){
              printer.print("newspaper.pdf");
            }else{
              const win = new PDFWindow({
                title: "Pepper Newspaper",
                width: 800,
                height: 600
              });
              win.loadURL("newspaper.pdf");
            }
          });
          job.render();
        }).catch(error => console.error(error));
      });
    }else if(store.get("newspaper") == "g"){
      fetch("https://content.guardianapis.com/search?api-key=4990266d-ade7-452b-af22-42208dc7a502").then(function(response){
        if(response.ok){
          return response.json();
        }
      }).then(function(data){
        var articles = [];
        data.response.results.forEach(function(article){
          fetch(article.webUrl).then(function(response){
            if(response.ok){
              return response.text();
            }
          }).then(function(data){
            var parsedData = unfluff(data);
            articles.push({
              title: article.webTitle,
              content: parsedData.text,
              imageUrl: parsedData.image
            });
          });
        });
        var htmlData = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><title>Pepper News Report</title><link href=\"https://fonts.googleapis.com/css?family=Merriweather:400,700\" rel=\"stylesheet\" type=\"text/css\"/><style>body,input,button,submit{font-family:\"Merriweather\",sans-serif;}body{margin:0;padding:2rem;}.main img{min-width:100%;}</style></head><body style=\"width:100%;height:100%;\"><div style=\"width:100%;text-align:center;\"><img src=\"https://i.ibb.co/60m7FgF/icon.png\" type=\"image/png\" style=\"display:inline-block;width:100px;height:100px;\"/></div><br/><br/><div class=\"main\">";
        articles.forEach(function(article){
          htmlData = htmlData + `<img src="https://api.allorigins.win/raw?url=${encodeUriComponent(article.imageUrl)}"><br/><h1>${article.title}</h1><br/>${article.content}<br/><br/>`;
        });
        htmlData = htmlData + "</div></body></html>";
        exporter.createJob(htmlData, "newspaper.pdf", {pageSize: store.get("paper")}, {inMemory: false}).then(function(job){
          job.on('job-complete', function(r){
            if(toPrint){
              printer.print("newspaper.pdf", {unix: `-o media=${store.get("paper")} -o sides=two-sided-long-edge`, win32: `-print-settings "duplexlong,paper=${store.get("paper")}"`});
            }else{
              pdfThing = new PDFWindow({
                title: "Pepper Newspaper",
                width: 800,
                height: 600
              });
              pdfThing.loadURL("newspaper.pdf");
            }
          });
          job.render();
        }).catch(error => console.error(error));
      });
    }
  }
}
schedule.scheduleJob("30 6 * * *", function(){printNewspaper(true);});
ipcMain.on("printNewspaper", function(event, arg){printNewspaper(true);});
ipcMain.on("showNewspaper", function(event, arg){printNewspaper(false);});
require("update-electron-app")();
app.on("ready", createWindow);
app.on("activate", function(){
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.on("window-all-closed", function(){
  if(false){app.quit();}
});
