from ftpretty import ftpretty
ftp=ftpretty("40.115.107.130","radu", "admin", port=8080)
ftp.dir()
ftp.delete("products.db")
#myfile=open("products.db", 'r',encoding="unicode_escape")

#f=myfile.read()
#print(f)
#ftp.put('products.db','products.db')
#ftp.get(products.db","products.db")
ftp.close()