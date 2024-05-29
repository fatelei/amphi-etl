import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useContext, useEffect, useCallback, useState, useRef } from 'react';
import type { GetRef, InputRef } from 'antd';
import {  Form, Table, ConfigProvider, Divider, Input, Select, Space, Button, Typography, Modal, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { bracesIcon, settingsIcon } from '../icons';


export class EnvVariables extends PipelineComponent<ComponentItem>() {

  public _name = "Env. Variables";
  public _id = "envVariables";
  public _type = "env_variables";
  public _category = "other";
  public _icon = bracesIcon;
  public _default = { };
  public _form = { };

  public static ConfigForm = ({ 
    nodeId, 
    data,
    context,
    componentService,
    manager,
    commands,
    store,
    setNodes
  }) => {
   // Define your default config
  
    const handleChange = useCallback((evtTargetValue: any, field: string) => {

      onChange({ evtTargetValue, field, nodeId, store, setNodes });
    }, [nodeId, store, setNodes]);

    type FormInstance<T> = GetRef<typeof Form<T>>;

    const EditableContext = React.createContext<FormInstance<any> | null>(null);
    
    interface Item {
      key: string;
      name: string;
      value: string;
      default: string;
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
      required: boolean;
    }
    
    const EditableCell: React.FC<EditableCellProps> = ({
      title,
      editable,
      children,
      dataIndex,
      record,
      handleSave,
      required,
      ...restProps
    }) => {
      const [editing, setEditing] = useState(false);
      const inputRef = useRef<InputRef>(null);
      const form = useContext(EditableContext)!;
    
      useEffect(() => {
        if (editing) {
          inputRef.current?.focus();
        }
      }, [editing]);
    
      const toggleEdit = () => {
        setEditing(!editing);
        form.setFieldsValue({ [dataIndex]: record[dataIndex] });
      };
    
      const save = async () => {
        try {
          const values = await form.validateFields();
          toggleEdit();
          handleSave({ ...record, ...values });
        } catch (errInfo) {
          console.log('Save failed:', errInfo);
        }
      };
    
      let childNode = children;
    
      if (editable) {
        childNode = editing ? (
          <Form.Item
            style={{ margin: 0 }}
            name={dataIndex}
            rules={required ? [
              {
                required: true,
                message: `${title} is required.`,
              },
            ] : []}
          >
            <Input ref={inputRef} onPressEnter={save} onBlur={save} onKeyDown={(e) => e.stopPropagation()} autoComplete="off"/>
          </Form.Item>
        ) : (
          <div
            className="editable-cell-value-wrap"
            style={{ paddingRight: 24, minHeight: '20px', width: '100%', display: 'inline-block' }}
            onClick={() => toggleEdit()}
          >
            {children}
          </div>
        );
      }
    
      return (
        <td {...restProps}>
          <div onDoubleClick={(e) => e.stopPropagation()}>
            {childNode}
          </div>
        </td>
      );
    };
    
    type EditableTableProps = Parameters<typeof Table>[0];
    
    interface DataType {
      key: React.Key;
      name: string;
      value: string;
      default: string;
    }
    
    type ColumnTypes = Exclude<EditableTableProps['columns'], undefined>;
    
    const [dataSource, setDataSource] = useState<DataType[]>(data.variables || []);

    useEffect(() => {
      handleChange(dataSource, "variables");
    }, [dataSource]);
  
      const [count, setCount] = useState(dataSource.length || 0);
    
      const handleDelete = (key: React.Key) => {
        const newData = dataSource.filter((item) => item.key !== key);
        setDataSource(newData);
      };
    
      const defaultColumns: (ColumnTypes[number] & { editable?: boolean; dataIndex: string, required?: boolean })[] = [
        {
          title: 'Name',
          dataIndex: 'name',
          width: '30%',
          editable: true,
          required: true
        },
        {
          title: 'Value',
          dataIndex: 'value',
          width: '40%',
          editable: true,
          required: false
        },
        {
          title: 'Default',
          dataIndex: 'default',
          width: '30%',
          editable: true,
          required: false
        },
        {
          title: '',
          dataIndex: 'operation',
          render: (_, record) =>
            dataSource.length >= 1 ? (
              <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.key)}>
                <DeleteOutlined />
              </Popconfirm>
            ) : null,
        }
      ];
    
      const handleAdd = () => {
        const newData: DataType = {
          key: count,
          name: `ENV_${count}`,
          value: '',
          default: ``,
        };
        setDataSource([...dataSource, newData]);
        setCount(count + 1);
      };
    
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
            required: col.required,
            handleSave,
          }),
        };
      });

      const [modal2Open, setModal2Open] = useState(false);
      const { Paragraph, Text } = Typography;
      const info = (
        <span>
          Specify Environment Variables and select them in components' inputs by typing <Text keyboard>{'{ '}</Text>
        </span>
      );    
    return (
      <>
      <ConfigProvider
        theme={{
          token: {
            // Seed Token
            colorPrimary: '#5F9B97',
          },
        }}
      >
        <Form
        layout="vertical"
        size="small">
        <div className="flex justify-center mt-1 pt-1.5 space-x-4">
        <Space direction="vertical" size="middle">
          <Space.Compact>
            <Paragraph style={{ padding: '5px' }}>
                  {info}
              </Paragraph>
          </Space.Compact>
          <Space.Compact>
          <span onClick={() => setModal2Open(true)}
            className="inline-flex items-center justify-center cursor-pointer group">
            <settingsIcon.react className="h-3 w-3 group-hover:text-primary" />
          </span>
          </Space.Compact>
          </Space>
        </div>
          <Modal
            title={this.Name}
            centered
            open={modal2Open}
            onOk={() => setModal2Open(false)}
            onCancel={() => setModal2Open(false)}
            width={800}
            footer={(_, { OkBtn }) => (
              <>
              <OkBtn />
              </>
            )}
          >
            <Form
              layout="vertical" >
            <div>
              <Paragraph style={{ padding: '5px' }}>
                {info}
              </Paragraph>
            <Button onClick={handleAdd} type="primary" style={{ marginBottom: 16 }}>
              Add environment variable
            </Button>
            <Table
              components={components}
              rowClassName={() => 'editable-row'}
              bordered
              dataSource={dataSource}
              columns={columns as ColumnTypes}
            />
          </div>            
          </Form>
          </Modal>      
      </Form>
    </ConfigProvider>
      </>
    );
  }



  public UIComponent({ id, data, context, componentService, manager, commands }) {

  const { setNodes, deleteElements, setViewport } = useReactFlow();
  const store = useStoreApi();

  const deleteNode = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  const zoomSelector = createZoomSelector();
  const showContent = useStore(zoomSelector);
  
  const selector = (s) => ({
    nodeInternals: s.nodeInternals,
    edges: s.edges,
  });

  const { nodeInternals, edges } = useStore(selector);
  const nodeId = id;
  const internals = { nodeInternals, edges, nodeId, componentService }

  // Create the handle element
  const handleElement = React.createElement(renderHandle, {
    type: EnvVariables.Type,
    Handle: Handle, // Make sure Handle is imported or defined
    Position: Position, // Make sure Position is imported or defined
    internals: internals
  });
  
  return (
    <>
      {renderComponentUI({
        id: id,
        data: data,
        context: context,
        manager: manager,
        commands: commands,
        name: EnvVariables.Name,
        ConfigForm: EnvVariables.ConfigForm({nodeId:id, data, context, componentService, manager, commands, store, setNodes}),
        Icon: EnvVariables.Icon,
        showContent: showContent,
        handle: handleElement,
        deleteNode: deleteNode,
        setViewport: setViewport
      })}
    </>
  );
  }

  public provideImports({config}): string[] {
    return ["import os"];
  }

  public generateComponentCode({config}): string {

    let code = ``;
    
      config.variables.forEach(variable => {
        // Initialize all environment variables to an empty string or the default value if provided
        if (variable.value) {
          code += `os.environ["${variable.name}"] = "${variable.value}"\n`;
        }
      });

    code += "\n";
    
    return code;
}



}