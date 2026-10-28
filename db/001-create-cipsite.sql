IF DB_ID(N'CIPSite') IS NULL
BEGIN
  CREATE DATABASE CIPSite;
END
GO

USE CIPSite;
GO

IF OBJECT_ID(N'dbo.ContactMessages', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ContactMessages
  (
    Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_ContactMessages PRIMARY KEY,
    Name nvarchar(200) NOT NULL,
    Email nvarchar(320) NULL,
    Message nvarchar(max) NULL,
    CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_ContactMessages_CreatedAt DEFAULT SYSUTCDATETIME()
  );
END
GO
