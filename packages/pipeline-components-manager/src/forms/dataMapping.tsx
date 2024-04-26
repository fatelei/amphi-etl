import React, { useContext, useEffect, useRef, useState } from 'react';
import type { GetRef, InputRef } from 'antd';
import {  Form, Table, ConfigProvider, Divider, Input, Select, Space, Button, Tag, Empty } from 'antd';

import { CodeGenerator } from '../CodeGenerator';
import { PipelineService } from '../PipelineService';
import { RequestService } from '../RequestService';
import { FieldDescriptor, Option } from '../configUtils';


interface DataMappingProps {
  data: any;
  field: FieldDescriptor;
  handleChange: (values: any, fieldId: string) => void;
  defaultValue: any;
  context: any;
  componentService: any;
  commands: any;
  nodeId: string;
  inDialog: boolean;
}

export const DataMapping: React.FC<DataMappingProps> = ({
  data, field, handleChange, defaultValue, context, componentService, commands, nodeId, inDialog
}) => {

  type FormInstance<T> = GetRef<typeof Form<T>>;
  const EditableContext = React.createContext<FormInstance<any> | null>(null);
  const [loadingsInput, setLoadingsInput] = useState<boolean>();
  const [loadingsOutput, setLoadingsOutput] = useState<boolean>();
  const [items, setItems] = useState<Option[]>([]);

  useEffect(() => {
    console.log("ITEMS %o", items)
  }, [items]);


  interface Item {
    input: any;
    key: React.Key;
    value: string;
    type: string;
  }
  
  interface EditableRowProps {
    index: number;
  }
  
  const EditableRow: React.FC<EditableRowProps> = ({ index, ...props }) => {
    const [form] = Form.useForm();
    return (
      <Form form={form} component={false}>
        <EditableContext.Provider value={form}>
          <tr {...props} />
        </EditableContext.Provider>
      </Form>
    );
  };
  
  interface EditableCellProps {
    title: React.ReactNode;
    editable: boolean;
    children: React.ReactNode;
    dataIndex: keyof Item;
    record: Item;
    handleSave: (record: Item) => void;
  }
  
  const EditableCell: React.FC<EditableCellProps> = ({
    title,
    editable,
    children,
    dataIndex,
    record,
    handleSave,
    ...restProps
  }) => {
    const form = useContext(EditableContext)!;
    const [editing, setEditing] = useState(true);

    const handleSelectChange = (selection: any, record: Item) => {
      const value = selection.value;
      const input = items.find(item => item.value === value); // Finds the item where value matches
      record.input = input; // Assigns the found item to record.input
      handleSave(record); // Save the updated record
    };
  
    let childNode = children;
  
    const toggleEdit = () => {
      setEditing(!editing);
      form.setFieldsValue({ [dataIndex]: record[dataIndex] });
    };

    if (editable) {
      childNode =
        <Form.Item
          style={{ margin: 0 }}
          name={dataIndex}
          rules={[
            {
              required: true,
              message: `${title} is required.`,
            },
          ]}
        >
          <ConfigProvider renderEmpty={customizeRenderEmpty}>
            <Select              
              showSearch  
              labelInValue
              size={inDialog ? "middle" : "small"}
              style={{ width: '100%' }}
              className="nodrag"
              onChange={(value) => {handleSelectChange(value, record); }}
              value={record.input?.value ?? ""}  
              placeholder={field.placeholder || 'Select ...'}
              {...(field.required ? { required: field.required } : {})}
              {...(field.tooltip ? { tooltip: field.tooltip } : {})}
              dropdownRender={(menu: any) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Space style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 2px 2px' }}>
                    <Button 
                    type="primary" 
                    onClick={(event) => {
                      RequestService.retrieveDataframeColumns(
                        event,
                        context,
                        commands,
                        componentService,
                        setItems,
                        setLoadingsInput,
                        nodeId,
                        0
                      );
                    }}
                    loading={loadingsInput}>
                      Retrieve columns
                  </Button>
                </Space>
                </>
              )}
              options={items.map((item: Option) => ({ label: item.label, value: item.value, type: item.type, named: item.named }))}
              optionRender={(option) => (
                <Space>
                  <span> {option.data.label}</span>
                  <Tag>{option.data.type}</Tag>
                </Space>
              )}
            />
          </ConfigProvider>
        </Form.Item>
  }
  
    return <td {...restProps}>{childNode}</td>;
  };
  
  type EditableTableProps = Parameters<typeof Table>[0];
  
  interface DataType {
    input: any;
    key: React.Key;
    value: string;
    type: string;
  }
  
  type ColumnTypes = Exclude<EditableTableProps['columns'], undefined>;
  
  const [dataSource, setDataSource] = useState<DataType[]>(defaultValue || []);
    
    useEffect(() => {
      console.log("datasource %o", dataSource)
      handleChange(dataSource, field.id);
    }, [dataSource]);


    const customizeRenderEmpty = () => (
      <div style={{ textAlign: 'center' }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  
    const defaultColumns: (ColumnTypes[number] & { editable?: boolean; dataIndex: string })[] = [
      {
        title: 'Input Columns',
        dataIndex: 'input',
        width: '50%',
        editable: true,
      },
      {
        title: 'Output Schema',
        dataIndex: 'value',
        width: '50%',
        editable: false,
        render: (_, record) => (
          <>
          <Space>
          <span>{record.value}</span>
            <Tag>{record.type}</Tag>
          </Space>
          </>
        )
      }
      /*
      {
        title: 'operation',
        dataIndex: 'operation',z
        render: (_, record) =>
          dataSource.length >= 1 ? (
            <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.key)}>
              <a>Delete</a>
            </Popconfirm>
          ) : null,
      },
      */
    ];
  
    /*
    const handleAdd = () => {
      const newData: DataType = {
        key: count,
        name: `Edward King ${count}`,
        type: 'text',
      };
      setDataSource([...dataSource, newData]);
      setCount(count + 1);
    };
    */
  
    const handleSave = (row: DataType) => {
      const newData = [...dataSource];
      const index = newData.findIndex((item) => row.key === item.key);
      const item = newData[index];
      newData.splice(index, 1, {
        ...item,
        ...row,
      });
      setDataSource(newData);
    };
  
    const components = {
      body: {
        row: EditableRow,
        cell: EditableCell,
      },
    };
  
    const columns = defaultColumns.map((col) => {
      if (!col.editable) {
        return col;
      }
      return {
        ...col,
        onCell: (record: DataType) => ({
          record,
          editable: col.editable,
          dataIndex: col.dataIndex,
          title: col.title,
          handleSave,
        }),
      };
    });

  return (
    <>
    <div>
      <Button type="primary" size="small" style={{ marginBottom: 16 }} onClick={(event) => RequestService.retrieveTableColumns(
          event,
          `mysql+pymysql://${data.dbOptions.username}:${data.dbOptions.password}@${data.dbOptions.host}:${data.dbOptions.port}/${data.dbOptions.databaseName}`,
          `${data.dbOptions.tableName}`,
          `DESCRIBE ${data.dbOptions.tableName}`,
          context,
          commands,
          componentService,
          setDataSource,
          setLoadingsOutput,
          nodeId
        )}
        loading={loadingsOutput}>
          Retrieve schema
        </Button>
      <Table
        components={components}
        rowClassName={() => 'editable-row'}
        bordered
        dataSource={dataSource}
        columns={columns as ColumnTypes}
      />
    </div>
    </>
  );

};

export default DataMapping;